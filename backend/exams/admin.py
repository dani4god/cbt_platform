# backend/exams/admin.py
from django.contrib import admin
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from .models import Exam, Question, Choice, ExamAttempt, StudentAnswer
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from import_export.widgets import ForeignKeyWidget
from django.contrib import messages

# --- Resources for Import/Export ---

class QuestionResource(resources.ModelResource):
    exam = fields.Field(
        column_name='exam_title',
        attribute='exam',
        widget=ForeignKeyWidget(Exam, field='title')
    )
    student_class = fields.Field(attribute='exam__student_class', column_name='student_class')
    choices_data = fields.Field(attribute=None, column_name='choices_data')
    correct_answer = fields.Field(attribute='correct_answer', column_name='correct_answer')
    
    class Meta:
        model = Question
        fields = ('id', 'exam_title', 'question_text', 'question_type', 'score_points', 'choices_data', 'student_class', 'correct_answer', 'difficulty_level')
        export_order = ('id', 'exam_title', 'question_text', 'question_type', 'score_points', 'choices_data', 'student_class', 'correct_answer', 'difficulty_level')

    def dehydrate_choices_data(self, obj):
        return " | ".join([
            f"{choice.choice_text}::{choice.is_correct}" for choice in obj.choices.all()
        ])

    def before_import_row(self, row, row_number=None, **kwargs):
        exam_title = row.get('exam_title').strip()
        student_class = row.get('student_class', '').strip()

        if not exam_title:
            raise Exception(f"Row {row_number}: 'exam_title' is required.")

        # Try to get existing exam case-insensitively
        exam = Exam.objects.filter(title__iexact=exam_title).first()
    
        if not exam:
            exam = Exam.objects.create(
                title=exam_title,
                duration_minutes=60,
                description=f"Imported exam: {exam_title}",
                student_class=student_class
            )

        self._current_row = row

    def after_import_row(self, row, row_result, **kwargs):
        instance = getattr(row_result, 'object', None) or getattr(row_result, 'instance', None)
        raw_choices = row.get('choices_data')

        if not instance:
            return
        
        raw_choices = row.get('choices_data')
        if raw_choices:
            # Delete existing choices
            instance.choices.all().delete()

            # Create new choices
            for item in raw_choices.split('|'):
                try:
                    text, correct = item.strip().split('::')
                    Choice.objects.create(
                        question=instance,
                        choice_text=text.strip().lower(),
                        is_correct=correct.strip().lower() == 'true'
                    )
                except ValueError:
                    continue

        if instance and instance.question_type == 'FB':
            correct_answer = row.get('correct_answer', '').strip()
            if correct_answer:
                instance.correct_answer = correct_answer.lower()
                instance.save()


@admin.register(Exam)
class ExamAdmin(ImportExportModelAdmin):
    list_display = (
        'title', 
        'duration_minutes', 
        'is_active', 
        'total_questions_available',
        'total_questions_to_ask', 
        'randomize_questions',
        'randomize_choices',
        'created_at', 
        'student_class'
    )
    list_filter = ('is_active', 'student_class', 'randomize_questions', 'randomize_choices')
    search_fields = ('title', 'student_class')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'student_class', 'duration_minutes', 'pass_mark', 'passing_score')
        }),
        ('Question Settings', {
            'fields': ('total_questions_to_ask', 'randomize_questions', 'randomize_choices'),
            'description': 'Control how many questions to ask and whether to randomize them.'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    
    def total_questions_available(self, obj):
        return obj.questions.count()
    total_questions_available.short_description = "Available Questions"
    
    def save_model(self, request, obj, form, change):
        """Override to validate question limits and show warnings."""
        try:
            obj.full_clean()  # This will call the model's clean() method
            super().save_model(request, obj, form, change)
            
            # Show informational messages
            if obj.total_questions_to_ask:
                available = obj.questions.count()
                if obj.total_questions_to_ask < available:
                    messages.info(
                        request,
                        f"This exam will randomly select {obj.total_questions_to_ask} questions from {available} available questions."
                    )
                elif obj.total_questions_to_ask == available:
                    messages.info(
                        request,
                        f"This exam will use all {available} available questions."
                    )
            
        except Exception as e:
            messages.error(request, str(e))


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 0


@admin.register(Question)
class QuestionAdmin(ImportExportModelAdmin):
    resource_class = QuestionResource
    list_display = (
        'question_text_preview', 
        'exam', 
        'question_type', 
        'difficulty_level',
        'score_points', 
        'display_choices'
    )
    list_filter = ('exam', 'question_type', 'difficulty_level', 'exam__student_class')
    search_fields = ('question_text',)
    inlines = [ChoiceInline]
    
    def question_text_preview(self, obj):
        """Show a truncated version of the question text."""
        return obj.question_text[:50] + "..." if len(obj.question_text) > 50 else obj.question_text
    question_text_preview.short_description = "Question Text"

    def display_choices(self, obj):
        return ", ".join([f"{c.choice_text} ({'✔' if c.is_correct else '✘'})" for c in obj.choices.all()])
    display_choices.short_description = "Choices"


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ('choice_text', 'question', 'is_correct')
    list_filter = ('question__exam', 'is_correct')
    search_fields = ('choice_text', 'question__question_text')


@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = (
        'student', 
        'exam', 
        'score', 
        'questions_assigned',
        'questions_answered',
        'is_completed', 
        'start_time', 
        'end_time'
    )
    list_filter = ('exam', 'exam__student_class', 'is_completed')
    actions = ['download_results_pdf']
    readonly_fields = ('assigned_question_ids', 'questions_assigned', 'questions_answered')
    search_fields = [
        'student__first_name',
        'student__last_name',
        'exam__title',
    ]
    
    def questions_assigned(self, obj):
        """Show number of questions assigned to this attempt."""
        return len(obj.assigned_question_ids) if obj.assigned_question_ids else 0
    questions_assigned.short_description = "Questions Assigned"
    
    def questions_answered(self, obj):
        """Show number of questions answered in this attempt."""
        return obj.student_answers.count()
    questions_answered.short_description = "Questions Answered"

    def download_results_pdf(self, request, queryset):
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="exam_results.pdf"'

        # Create PDF document
        doc = SimpleDocTemplate(response, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(Paragraph("Exam Results Report", styles['Heading1']))
        elements.append(Spacer(1, 12))

        # Table headers
        data = [["First Name", "Last Name", "Class", "Email", "Attempt ID", "Subject", "Questions", "Score", "Status"]]

        # Table rows
        for attempt in queryset:
            user = attempt.student
            student_class = getattr(user, 'student_class', '')

            questions_assigned = len(attempt.assigned_question_ids) if attempt.assigned_question_ids else attempt.exam.questions.count()
            correct_answers = attempt.student_answers.filter(is_correct=True).count()
            score_display = f"{correct_answers}/{questions_assigned}"

            data.append([
                user.first_name,
                user.last_name,
                student_class,
                user.email,
                str(attempt.id),
                attempt.exam.title if hasattr(attempt.exam, 'title') else str(attempt.exam),
                str(questions_assigned),
                score_display,
                "Completed" if attempt.is_completed else "In Progress"
            ])

        # Create and style the table
        table = Table(data, repeatRows=1, colWidths=[60, 60, 50, 100, 50, 80, 50, 50, 60])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(table)

        # Build PDF
        doc.build(elements)
        return response

    download_results_pdf.short_description = "Download selected results as PDF"


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question_preview', 'chosen_choice', 'is_correct', 'score')
    list_filter = ('is_correct', 'attempt__exam')
    search_fields = ('attempt__student__username', 'question__question_text')
    
    def question_preview(self, obj):
        """Show a preview of the question text."""
        return obj.question.question_text[:30] + "..." if len(obj.question.question_text) > 30 else obj.question.question_text
    question_preview.short_description = "Question"
