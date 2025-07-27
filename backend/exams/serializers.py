# backend/exams/serializers.py
from rest_framework import serializers
from .models import Exam, Question, Choice, ExamAttempt, StudentAnswer

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'choice_text', 'choice_id']
        # Note: We don't include 'is_correct' to prevent cheating

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 
            'question_text', 
            'question_type', 
            'score_points', 
            'question_id',
            'choices'
        ]
        # Note: We don't include 'correct_answer' to prevent cheating

class ExamSerializer(serializers.ModelSerializer):
    total_questions_available = serializers.SerializerMethodField()
    questions_to_ask = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id',
            'title',
            'description',
            'duration_minutes',
            'pass_mark',
            'passing_score',
            'student_class',
            'exam_id',
            'total_questions_available',
            'questions_to_ask',
            'randomize_questions',
            'randomize_choices',
            'is_active',
        ]
    
    def get_total_questions_available(self, obj):
        """Return total number of questions in the question bank."""
        return obj.questions.count()
    
    def get_questions_to_ask(self, obj):
        """Return number of questions that will be asked to students."""
        return obj.total_questions_to_ask or obj.questions.count()

class ExamAttemptSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    exam_duration = serializers.IntegerField(source='exam.duration_minutes', read_only=True)
    questions_assigned = serializers.SerializerMethodField()
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id',
            'exam',
            'exam_title',
            'exam_duration',
            'start_time',
            'end_time',
            'score',
            'is_completed',
            'attempt_id',
            'questions_assigned'
        ]
        read_only_fields = ['start_time', 'end_time', 'score', 'is_completed']
    
    def get_questions_assigned(self, obj):
        """Return number of questions assigned to this attempt."""
        if obj.assigned_question_ids:
            return len(obj.assigned_question_ids)
        return obj.exam.total_questions_to_ask or obj.exam.questions.count()

class StudentAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    chosen_choice_text = serializers.CharField(source='chosen_choice.choice_text', read_only=True)
    
    class Meta:
        model = StudentAnswer
        fields = [
            'id',
            'question',
            'question_text',
            'chosen_choice',
            'chosen_choice_text',
            'answer_text',
            'is_correct',
            'score',
            'answer_id'
        ]
        read_only_fields = ['is_correct', 'score']

class ExamAttemptResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    correct_answers = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    percentage_score = serializers.SerializerMethodField()
    passed = serializers.SerializerMethodField()
    time_taken = serializers.SerializerMethodField()
    questions_assigned = serializers.SerializerMethodField()
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id',
            'exam',
            'exam_title',
            'student_name',
            'student_username',
            'start_time',
            'end_time',
            'score',
            'correct_answers',
            'total_questions',
            'questions_assigned',
            'percentage_score',
            'passed',
            'time_taken',
            'is_completed',
            'attempt_id'
        ]
    
    def get_correct_answers(self, obj):
        """Get number of correct answers, considering MS questions properly."""
        # Get the context values if available (set in views)
        if 'correct_answers' in self.context:
            return self.context['correct_answers']
        
        # Fallback calculation
        ms_correct = obj.student_answers.filter(
            question__question_type='MS',
            chosen_choice__isnull=True,  # Summary records
            is_correct=True
        ).count()
        
        other_correct = obj.student_answers.filter(
            question__question_type__in=['MC', 'TF', 'FB'],
            is_correct=True
        ).count()
        
        return ms_correct + other_correct
    
    def get_total_questions(self, obj):
        """Get total number of questions in this attempt."""
        # Get the context values if available (set in views)
        if 'total_questions' in self.context:
            return self.context['total_questions']
        
        # Use assigned questions if available
        if obj.assigned_question_ids:
            return len(obj.assigned_question_ids)
        
        # Fallback to exam total
        return obj.exam.total_questions_to_ask or obj.exam.questions.count()
    
    def get_questions_assigned(self, obj):
        """Return number of questions assigned to this attempt."""
        if obj.assigned_question_ids:
            return len(obj.assigned_question_ids)
        return obj.exam.total_questions_to_ask or obj.exam.questions.count()
    
    def get_percentage_score(self, obj):
        """Calculate percentage score."""
        total_questions = self.get_total_questions(obj)
        if total_questions == 0:
            return 0
        correct_answers = self.get_correct_answers(obj)
        return round((correct_answers / total_questions) * 100, 1)
    
    def get_passed(self, obj):
        """Determine if the student passed."""
        percentage = self.get_percentage_score(obj)
        return percentage >= obj.exam.pass_mark
    
    def get_time_taken(self, obj):
        """Calculate time taken in minutes."""
        if obj.end_time and obj.start_time:
            delta = obj.end_time - obj.start_time
            return round(delta.total_seconds() / 60, 1)
        return None

class ExamStatisticsSerializer(serializers.Serializer):
    """Serializer for exam statistics (used in admin/analytics)."""
    total_questions_available = serializers.IntegerField()
    questions_to_ask = serializers.IntegerField()
    randomization_enabled = serializers.BooleanField()
    choice_randomization_enabled = serializers.BooleanField()
    question_type_distribution = serializers.DictField()
    difficulty_distribution = serializers.DictField()
    
class QuestionPreviewSerializer(serializers.Serializer):
    """Serializer for question preview (admin use)."""
    total_questions = serializers.IntegerField()
    preview_questions = serializers.ListField()
    showing_first = serializers.IntegerField()
