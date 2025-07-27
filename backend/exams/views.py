# backend/exams/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from decimal import Decimal

from .models import Exam, Question, Choice, ExamAttempt, StudentAnswer
from .serializers import (
    ExamSerializer, QuestionSerializer, ExamAttemptSerializer,
    StudentAnswerSerializer, ExamAttemptResultSerializer
)
from .utils import calculate_and_save_score

class AvailableExamsView(generics.ListAPIView):
    queryset = Exam.objects.filter(is_active=True).order_by('title')
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]


class ExamQuestionsView(generics.ListAPIView):
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        exam_id = self.kwargs['exam_id']
        exam = get_object_or_404(Exam, id=exam_id, is_active=True)
        
        # Check if user has an active attempt
        student = self.request.user
        attempt = ExamAttempt.objects.filter(
            student=student,
            exam=exam,
            is_completed=False
        ).first()
        
        if attempt and attempt.assigned_question_ids:
            # Return previously assigned questions for this attempt
            return attempt.get_assigned_questions()
        else:
            # Get questions based on exam settings (randomized or not)
            questions = exam.get_questions_for_student(student.id)
            
            # If there's an active attempt, update it with assigned questions
            if attempt:
                attempt.assigned_question_ids = [q.id for q in questions]
                attempt.save()
            
            return questions

    def list(self, request, *args, **kwargs):
        """Override list to include randomized choices if needed."""
        queryset = self.get_queryset()
        student_id = request.user.id
        
        # Serialize questions with potentially randomized choices
        serialized_questions = []
        for question in queryset:
            serializer = self.get_serializer(question)
            question_data = serializer.data
            
            # If choices should be randomized, apply randomization
            if question.question_type in ['MC', 'TF', 'MS'] and question.exam.randomize_choices:
                randomized_choices = question.get_randomized_choices(student_id)
                # Update the choices in the serialized data
                choice_serializer = self.get_serializer().fields['choices'].child
                question_data['choices'] = [
                    choice_serializer.to_representation(choice) for choice in randomized_choices
                ]
            
            serialized_questions.append(question_data)
        
        return Response(serialized_questions)


class StartExamView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, exam_id, format=None):
        exam = get_object_or_404(Exam, id=exam_id)
        student = request.user

        # ✅ Check if exam is active
        if not exam.is_active:
            return Response(
                {"detail": "This exam is not currently active."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Check for completed attempts FIRST
        completed_attempt = ExamAttempt.objects.filter(
            student=student,
            exam=exam,
            is_completed=True
        ).exists()

        if completed_attempt:
            return Response(
                {"detail": "You have already completed this exam."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ If not completed, check if there's an in-progress attempt
        existing_attempt = ExamAttempt.objects.filter(
            student=student,
            exam=exam,
            is_completed=False
        ).first()

        if existing_attempt:
            # 🕒 Handle time expiration
            elapsed_time = (timezone.now() - existing_attempt.start_time).total_seconds() / 60
            if elapsed_time >= exam.duration_minutes:
                # Auto-submit
                attempt, correct, total = calculate_and_save_score(existing_attempt)
                serializer = ExamAttemptResultSerializer(attempt, context={
                    'correct_answers': correct,
                    'total_questions': total
                })
                response_data = serializer.data
                response_data["detail"] = "Time limit exceeded. Your attempt has been automatically submitted."
                return Response(response_data, status=status.HTTP_200_OK)

            # ✅ Continue the in-progress attempt
            serializer = ExamAttemptSerializer(existing_attempt)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # 🆕 If no completed or in-progress attempt, create a new one
        # Get the questions that will be assigned to this student
        assigned_questions = exam.get_questions_for_student(student.id)
        assigned_question_ids = [q.id for q in assigned_questions]

        new_attempt = ExamAttempt.objects.create(
            student=student,
            exam=exam,
            start_time=timezone.now(),
            is_completed=False,
            score=0,
            assigned_question_ids=assigned_question_ids
        )
        
        serializer = ExamAttemptSerializer(new_attempt)
        response_data = serializer.data
        response_data['total_questions'] = len(assigned_question_ids)
        response_data['message'] = f"Exam started with {len(assigned_question_ids)} questions"
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class SubmitAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, attempt_id, format=None):
        student = request.user
        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=student, is_completed=False)
        exam = attempt.exam

        question_id = request.data.get('question_id')
        chosen_choice_id = request.data.get('chosen_choice_id')
        answer_text = request.data.get('answer_text', '').strip()

        question = None
        chosen_choice = None
        is_correct = False
        question_score = Decimal('0.00')

        if question_id:
            # Ensure the question is in the student's assigned questions
            if question_id not in attempt.assigned_question_ids:
                return Response(
                    {"error": "This question is not assigned to your attempt."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            question = get_object_or_404(Question, id=question_id, exam=exam)

            if question.question_type == 'FB':
                # Use the correct_answer field from your model
                correct_answer = (question.correct_answer or '').strip().lower()
                is_correct = normalize(answer_text) == normalize(correct_answer)
                if is_correct:
                    question_score = question.score_points

                student_answer, created = StudentAnswer.objects.get_or_create(
                    attempt=attempt,
                    question=question,
                    defaults={
                        'chosen_choice': None,
                        'answer_text': answer_text,
                        'is_correct': is_correct,
                        'score': question_score
                    }
                )
                if not created:
                    student_answer.answer_text = answer_text
                    student_answer.is_correct = is_correct
                    student_answer.score = question_score
                    student_answer.save()

            elif question.question_type == 'MS':
                # Parse selected IDs from answer_text
                if isinstance(answer_text, str) and answer_text:
                    try:
                        selected_ids = [int(x.strip()) for x in answer_text.split(',') if x.strip().isdigit()]
                    except ValueError:
                        selected_ids = []
                elif isinstance(answer_text, list):
                    selected_ids = [int(x) for x in answer_text if str(x).isdigit()]
                else:
                    selected_ids = []

                # Clear existing answers for this question in this attempt
                StudentAnswer.objects.filter(attempt=attempt, question=question).delete()

                # Get correct answer IDs
                correct_ids = set(question.choices.filter(is_correct=True).values_list('id', flat=True))
                total_correct = len(correct_ids)
                
                if total_correct == 0:
                    return Response(
                        {"error": "This question has no correct answers defined."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

                selected_ids_set = set(selected_ids)
                correct_selected = len(selected_ids_set & correct_ids)
                incorrect_selected = len(selected_ids_set - correct_ids)

                # Calculate score: (correct - incorrect) / total_correct * question_score, minimum 0
                raw_score = (correct_selected - incorrect_selected) / total_correct
                question_score = max(Decimal('0.00'), round(Decimal(str(raw_score)) * question.score_points, 2))

                # Mark as correct only if all correct answers selected and no incorrect ones
                is_correct = (correct_selected == total_correct and incorrect_selected == 0)

                # Create StudentAnswer for each selected choice
                for choice_id in selected_ids:
                    try:
                        choice = Choice.objects.get(id=choice_id, question=question)
                        is_choice_correct = choice.id in correct_ids
                        
                        # Individual score for this choice
                        individual_score = (question.score_points / total_correct) if is_choice_correct else Decimal('0.00')
                        
                        StudentAnswer.objects.create(
                            attempt=attempt,
                            question=question,
                            chosen_choice=choice,
                            is_correct=is_choice_correct,
                            score=round(individual_score, 2),
                            answer_text=choice.choice_text
                        )
                    except Choice.DoesNotExist:
                        continue

                # Also create a summary record with the total score for this MS question
                StudentAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    chosen_choice=None,
                    answer_text=','.join(map(str, selected_ids)),
                    is_correct=is_correct,
                    score=question_score
                )

                return Response({
                    "question_id": question_id,
                    "selected_choices": selected_ids,
                    "score": float(question_score),
                    "is_correct": is_correct,
                    "message": "Multiple select answer saved successfully."
                }, status=status.HTTP_201_CREATED)

            else:  # MC, TF questions
                if chosen_choice_id:
                    chosen_choice = get_object_or_404(Choice, id=chosen_choice_id, question=question)
                    is_correct = chosen_choice.is_correct
                    question_score = question.score_points if is_correct else Decimal('0.00')

                student_answer, created = StudentAnswer.objects.get_or_create(
                    attempt=attempt,
                    question=question,
                    defaults={
                        'chosen_choice': chosen_choice,
                        'answer_text': answer_text,
                        'is_correct': is_correct,
                        'score': question_score
                    }
                )
                if not created:
                    student_answer.chosen_choice = chosen_choice
                    student_answer.answer_text = answer_text
                    student_answer.is_correct = is_correct
                    student_answer.score = question_score
                    student_answer.save()

        # Check for timeout after saving
        elapsed_time = (timezone.now() - attempt.start_time).total_seconds() / 60
        if elapsed_time >= exam.duration_minutes:
            attempt, correct, total = calculate_and_save_score(attempt)
            serializer = ExamAttemptResultSerializer(attempt, context={
                'correct_answers': correct,
                'total_questions': total
            })
            return Response({
                "detail": "Time limit exceeded. Exam auto-submitted.",
                "result": serializer.data
            }, status=status.HTTP_400_BAD_REQUEST)

        if question.question_type != 'MS':
            serializer = StudentAnswerSerializer(student_answer)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        else:
            return Response({"message": "Answer saved successfully."}, status=status.HTTP_201_CREATED)


def normalize(text):
    """Normalize text for comparison (remove extra spaces, convert to lowercase)"""
    if not text:
        return ""
    return ' '.join(text.strip().lower().split())


class SubmitExamView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, attempt_id, format=None):
        student = request.user
        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=student, is_completed=False)
        if attempt.is_completed:
            return Response({"detail": "This exam attempt has already been submitted."},
                            status=status.HTTP_400_BAD_REQUEST)
        attempt, correct, total = calculate_and_save_score(attempt)
        serializer = ExamAttemptResultSerializer(attempt, context={
            'correct_answers': correct,
            'total_questions': total
        })
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExamResultsView(generics.RetrieveAPIView):
    queryset = ExamAttempt.objects.all()
    serializer_class = ExamAttemptResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExamAttempt.objects.filter(student=self.request.user, is_completed=True)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class PastExamAttemptsView(generics.ListAPIView):
    serializer_class = ExamAttemptResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExamAttempt.objects.filter(
            student=self.request.user,
            is_completed=True
        ).order_by('-end_time')
