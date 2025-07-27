# backend/exams/utils.py
from django.utils import timezone

def calculate_and_save_score(attempt):
    """
    Calculate the final score for an exam attempt.
    Updated to work with assigned questions and handle different question types.
    """
    # Get all student answers for this attempt
    student_answers = attempt.student_answers.all()
    
    # For Multiple Select questions, we only want the summary records (chosen_choice=None)
    # to avoid double counting
    ms_summary_answers = student_answers.filter(
        question__question_type='MS',
        chosen_choice__isnull=True
    )
    
    # For other question types, get regular answers
    other_answers = student_answers.filter(
        question__question_type__in=['MC', 'TF', 'FB']
    )
    
    # Combine both querysets
    all_relevant_answers = list(ms_summary_answers) + list(other_answers)
    
    # Calculate totals
    total_score = sum(answer.score for answer in all_relevant_answers)
    correct_answers = sum(1 for answer in all_relevant_answers if answer.is_correct)
    
    # Get total questions assigned to this attempt
    if attempt.assigned_question_ids:
        total_questions = len(attempt.assigned_question_ids)
    else:
        # Fallback to all exam questions if no specific assignment
        total_questions = attempt.exam.questions.count()
    
    # Update the attempt
    attempt.score = total_score
    attempt.is_completed = True
    attempt.end_time = timezone.now()
    attempt.save()
    
    return attempt, correct_answers, total_questions


def get_exam_statistics(exam):
    """
    Get statistics for an exam including question distribution.
    """
    total_questions = exam.questions.count()
    questions_to_ask = exam.total_questions_to_ask or total_questions
    
    # Question type distribution
    question_types = exam.questions.values('question_type').distinct()
    type_counts = {}
    for q_type in question_types:
        type_name = q_type['question_type']
        count = exam.questions.filter(question_type=type_name).count()
        type_counts[type_name] = count
    
    # Difficulty distribution (if using difficulty levels)
    difficulty_counts = {}
    difficulties = exam.questions.values('difficulty_level').distinct()
    for diff in difficulties:
        diff_name = diff['difficulty_level']
        count = exam.questions.filter(difficulty_level=diff_name).count()
        difficulty_counts[diff_name] = count
    
    return {
        'total_questions_available': total_questions,
        'questions_to_ask': questions_to_ask,
        'randomization_enabled': exam.randomize_questions,
        'choice_randomization_enabled': exam.randomize_choices,
        'question_type_distribution': type_counts,
        'difficulty_distribution': difficulty_counts,
    }


def validate_exam_configuration(exam):
    """
    Validate that an exam is properly configured.
    Returns a list of warnings/errors.
    """
    issues = []
    
    total_questions = exam.questions.count()
    
    if total_questions == 0:
        issues.append("No questions have been added to this exam.")
        return issues
    
    if exam.total_questions_to_ask and exam.total_questions_to_ask > total_questions:
        issues.append(f"Cannot ask {exam.total_questions_to_ask} questions when only {total_questions} are available.")
    
    # Check if all questions have at least one correct answer (for MC, TF, MS)
    mc_questions_without_correct = exam.questions.filter(
        question_type__in=['MC', 'TF', 'MS']
    ).exclude(
        choices__is_correct=True
    ).count()
    
    if mc_questions_without_correct > 0:
        issues.append(f"{mc_questions_without_correct} multiple choice/select questions don't have correct answers marked.")
    
    # Check fill-in-blank questions have correct answers
    fb_questions_without_correct = exam.questions.filter(
        question_type='FB',
        correct_answer__isnull=True
    ).count() + exam.questions.filter(
        question_type='FB',
        correct_answer__exact=''
    ).count()
    
    if fb_questions_without_correct > 0:
        issues.append(f"{fb_questions_without_correct} fill-in-blank questions don't have correct answers set.")
    
    return issues


def preview_student_questions(exam, student_id, limit=5):
    """
    Preview what questions a student would get (for testing/admin purposes).
    """
    questions = exam.get_questions_for_student(student_id)
    
    preview_data = []
    for i, question in enumerate(questions[:limit]):
        question_data = {
            'order': i + 1,
            'id': question.id,
            'text': question.question_text[:100] + "..." if len(question.question_text) > 100 else question.question_text,
            'type': question.get_question_type_display(),
            'difficulty': question.difficulty_level,
            'score_points': float(question.score_points)
        }
        
        if question.question_type in ['MC', 'TF', 'MS']:
            choices = question.get_randomized_choices(student_id) if exam.randomize_choices else question.choices.all()
            question_data['choices'] = [
                {
                    'text': choice.choice_text[:50] + "..." if len(choice.choice_text) > 50 else choice.choice_text,
                    'is_correct': choice.is_correct
                }
                for choice in choices[:4]  # Limit to first 4 choices for preview
            ]
        
        preview_data.append(question_data)
    
    return {
        'total_questions': len(questions),
        'preview_questions': preview_data,
        'showing_first': min(limit, len(questions))
    }
