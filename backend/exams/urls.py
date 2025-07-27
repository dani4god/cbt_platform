# backend/exams/urls.py

from django.urls import path
from .views import AvailableExamsView, ExamQuestionsView, StartExamView, SubmitAnswerView, SubmitExamView, ExamResultsView, PastExamAttemptsView # Import your views

urlpatterns = [
    # Student Portal Endpoints
    path('exams/available/', AvailableExamsView.as_view(), name='available-exams'),
    path('exams/<int:exam_id>/questions/', ExamQuestionsView.as_view(), name='exam-questions'),
    path('exams/<int:exam_id>/start/', StartExamView.as_view(), name='start-exam'), # <--- Add this line
    path('attempts/<int:attempt_id>/submit-answer/', SubmitAnswerView.as_view(), name='submit-answer'), # <--- Add this line

    # backend/exams/urls.py

    # backend/exams/urls.py


    # Future Endpoints (Placeholders)
    path('attempts/<int:attempt_id>/submit/', SubmitExamView.as_view(), name='submit-exam'),
    path('attempts/<int:pk>/results/', ExamResultsView.as_view(), name='exam-results'),
    path('attempts/history/', PastExamAttemptsView.as_view(), name='past-attempts-history'),
]



    # Student Portal Endpoints
   

    # Future Endpoints (Placeholders)
    # path('attempts/<int:attempt_id>/submit-answer/', SubmitAnswerView.as_view(), name='submit-answer'),
    # path('attempts/<int:attempt_id>/submit/', SubmitExamView.as_view(), name='submit-exam'),
    # path('attempts/<int:attempt_id>/results/', ExamResultsView.as_view(), name='exam-results'),



    # Future Endpoints (Placeholders)
    # path('exams/<int:exam_id>/start/', StartExamView.as_view(), name='start-exam'),
    # path('attempts/<int:attempt_id>/submit-answer/', SubmitAnswerView.as_view(), name='submit-answer'),
    # path('attempts/<int:attempt_id>/submit/', SubmitExamView.as_view(), name='submit-exam'),
    # path('attempts/<int:attempt_id>/results/', ExamResultsView.as_view(), name='exam-results'),

