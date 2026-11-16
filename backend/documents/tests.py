from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from documents.models import EmployeeDocument


class DocumentModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@ems.local',
            password='TestPassword123!',
            first_name='Admin',
            last_name='User',
            role=User.Role.ADMIN,
        )
        self.employee1 = User.objects.create_user(
            email='emp1@ems.local',
            password='TestPassword123!',
            first_name='John',
            last_name='Doe',
            role=User.Role.EMPLOYEE,
        )
        self.employee2 = User.objects.create_user(
            email='emp2@ems.local',
            password='TestPassword123!',
            first_name='Jane',
            last_name='Smith',
            role=User.Role.EMPLOYEE,
        )

        test_file = SimpleUploadedFile('passport.pdf', b'%PDF-1.4 test content', content_type='application/pdf')
        self.doc1 = EmployeeDocument.objects.create(
            employee=self.employee1,
            title='Passport John',
            category=EmployeeDocument.Category.ID_PROOF,
            file=test_file,
            uploaded_by=self.employee1,
        )

    def test_employee_can_only_view_own_documents(self):
        self.client.force_authenticate(user=self.employee2)
        response = self.client.get('/api/v1/documents/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

        self.client.force_authenticate(user=self.employee1)
        response = self.client.get('/api/v1/documents/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Passport John')

    def test_admin_can_view_all_documents(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/documents/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

    def test_employee_document_upload(self):
        self.client.force_authenticate(user=self.employee2)
        uploaded = SimpleUploadedFile('contract.pdf', b'%PDF-1.4 sample file', content_type='application/pdf')
        response = self.client.post('/api/v1/documents/documents/', {
            'title': 'Signed Contract Jane',
            'category': 'CONTRACT',
            'document_file': uploaded,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EmployeeDocument.objects.filter(employee=self.employee2).count(), 1)
