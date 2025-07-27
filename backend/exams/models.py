# backend/exams/models.py
from django.db import models
from django.conf import settings
import uuid
import random
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL

class Exam(models.Model):
    """Represents an exam with questions."""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    duration_minutes = models.PositiveIntegerField(
        help_text="Duration of the exam in minutes."
    )
    pass_mark = models.PositiveIntegerField(
        default=50,
        help_text="Percentage score required to pass the exam."
    )
    is_active = models.BooleanField(
        default=False,
        help_text="If true, the exam is available for students to take."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    exam_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    passing_score = models.IntegerField(default=70, help_text="Minimum score required to pass this exam (as a percentage or raw score).")
    student_class = models.CharField(max_length=50, blank=True, null=True)
    
    # NEW FIELDS FOR QUESTION LIMITS AND RANDOMIZATION
    total_questions_to_ask = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Number of questions to ask from the total question pool. If blank, all questions will be asked."
    )
    randomize_questions = models.BooleanField(
        default=False,
        help_text="If true, questions will be randomly selected for each student attempt."
    )
    randomize_choices = models.BooleanField(
        default=False,
        help_text="If true, answer choices will be randomized for each student."
    )

    def clean(self):
        """Validate that total_questions_to_ask doesn't exceed available questions."""
        super().clean()
        if self.pk and self.total_questions_to_ask:
            total_available = self.questions.count()
            if self.total_questions_to_ask > total_available:
                raise ValidationError(
                    f"Cannot ask {self.total_questions_to_ask} questions when only {total_available} are available."
                )

    def get_questions_for_student(self, student_id):
        """
        Get questions for a specific student, applying randomization if enabled.
        Uses student_id as seed for consistent randomization per student.
        """
        all_questions = list(self.questions.all())
        
        if not self.randomize_questions:
            # No randomization, return questions in order
            questions = all_questions
        else:
            # Create a deterministic random seed based on exam_id and student_id
            # This ensures the same student gets the same questions on multiple attempts
            seed = hash(f"{self.exam_id}_{student_id}")
            random.seed(seed)
            questions = random.sample(all_questions, len(all_questions))
        
        # Limit the number of questions if specified
        if self.total_questions_to_ask:
            questions = questions[:self.total_questions_to_ask]
        
        return questions

    def __str__(self):
        return self.title


class Question(models.Model):
    """Represents a question within an exam."""
    EXAM_QUESTION_TYPE_CHOICES = (
        ('MC', 'Multiple Choice'),
        ('TF', 'True/False'),
        ('FB', 'Fill-in-the-Blank'),
        ('MS', 'Multiple Select'),
    )

    exam = models.ForeignKey(
        Exam,
        related_name='questions',
        on_delete=models.CASCADE,
        help_text="The exam this question belongs to."
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=2,
        choices=EXAM_QUESTION_TYPE_CHOICES,
        default='MC'
    )
    score_points = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.00,
        help_text="Points awarded for a correct answer."
    )
    correct_answer = models.TextField(
        blank=True,
        null=True,
        help_text="Correct answer for fill-in-the-blank questions"
    )
    question_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # NEW FIELD FOR QUESTION DIFFICULTY/CATEGORY (OPTIONAL)
    difficulty_level = models.CharField(
        max_length=10,
        choices=[
            ('easy', 'Easy'),
            ('medium', 'Medium'),
            ('hard', 'Hard'),
        ],
        default='medium',
        help_text="Difficulty level of the question for better randomization."
    )

    def get_randomized_choices(self, student_id=None):
        """Get choices for this question, randomized if exam settings allow."""
        choices = list(self.choices.all())
        
        if self.exam.randomize_choices and student_id:
            # Create deterministic randomization based on question and student
            seed = hash(f"{self.question_id}_{student_id}")
            random.seed(seed)
            random.shuffle(choices)
        
        return choices

    def __str__(self):
        return f"{self.exam.title} - Question: {self.question_text[:50]}..."
    
    def get_correct_answer(self):
        """Return the correct answer depending on question type."""
        if self.question_type == 'FB':
            return self.correct_answer
        elif self.question_type in ['MC', 'TF', 'MS']:
            correct_choice = self.choices.filter(is_correct=True).first()
            return correct_choice.choice_text if correct_choice else None
        return None


class Choice(models.Model):
    """Represents an answer choice for a Multiple Choice question."""
    question = models.ForeignKey(
        Question,
        related_name='choices',
        on_delete=models.CASCADE,
        help_text="The question this choice belongs to."
    )
    choice_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    choice_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    def __str__(self):
        return self.choice_text


class ExamAttempt(models.Model):
    """Records a student's attempt at an exam."""
    student = models.ForeignKey(
        User,
        related_name='exam_attempts',
        on_delete=models.CASCADE
    )
    exam = models.ForeignKey(
        Exam,
        related_name='attempts',
        on_delete=models.CASCADE

    

    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0.00
    )

    is_completed = models.BooleanField(default=False)
    attempt_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # NEW FIELD TO STORE ASSIGNED QUESTIONS FOR THIS ATTEMPT
    assigned_question_ids = models.JSONField(
        default=list,
        help_text="List of question IDs assigned to this student for this attempt"
    )

    def get_assigned_questions(self):
        """Get the questions assigned to this attempt."""
        if not self.assigned_question_ids:
            return Question.objects.none()
        return Question.objects.filter(id__in=self.assigned_question_ids).order_by('id')

    def __str__(self):
        return f"{self.student.username}'s attempt on {self.exam.title}"


class StudentAnswer(models.Model):
    """Records a student's answer to a specific question in an attempt."""
    attempt = models.ForeignKey(
        ExamAttempt,
        related_name='student_answers',
        on_delete=models.CASCADE
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE
    )
    chosen_choice = models.ForeignKey(
        Choice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    answer_text = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    score = models.DecimalField(default=0, decimal_places=2, max_digits=5)
    answer_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    def __str__(self):
        return f"Answer for {self.attempt.student.username} on Q: {self.question.id}"
