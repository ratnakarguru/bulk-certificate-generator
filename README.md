# Bulk Certificate Generator

A web application that generates certificates in bulk using a predefined certificate template. Users can enter company details, event information, completion dates, and recipient details to generate downloadable PDF certificates.

The application uses FastAPI for the backend, React for the frontend, SQLite for data storage, and ReportLab for PDF generation.

## Features

- Generate certificates for multiple recipients in one request.
- Customize certificates with company name, recipient name, event name, and completion date.
- Professional Navy and Gold certificate design.
- Validate recipient information before generation.
- Continue processing when an individual recipient fails.
- Track job status and generation progress.
- View successful and failed recipient results.
- Download individual certificates as PDF files.
- Download all successful certificates as a ZIP file.
- Store generation jobs and recipient results in a relational database.
- Provide API documentation through Swagger UI.

## Technology Stack

**Frontend**
- React
- Vite
- Bootstrap
- Bootstrap Icons

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- ReportLab

**Database**
- SQLite

**Testing**
- Pytest
- HTTPX

## Project Structure

```text
bulk-certificate-generator/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── jobs.py
│   │   │   └── certificates.py
│   │   └── services/
│   │       ├── certificate.py
│   │       └── generator.py
│   ├── tests/
│   ├── generated/
│   ├── requirements.txt
│   └── certificates.db
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── index.html
└── README.md
```

## Prerequisites

Install the following before running the project:

- Python 3.10 or newer
- Node.js and npm
- Git (optional)

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd bulk-certificate-generator
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your repository URL. If you already have the project locally, open its root directory instead.

### 2. Set up the backend

Open a terminal and navigate to the backend folder.

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
python -m pip install -r requirements.txt
```

If a requirements file is not available, install the main packages:

```bash
python -m pip install fastapi "uvicorn[standard]" sqlalchemy reportlab "pydantic[email]" python-multipart pytest httpx
```

### 3. Start the backend

Run this command from the `backend` directory:

```bash
python -m uvicorn app.main:app --reload
```

The backend will run at:

http://127.0.0.1:8000

Open Swagger UI to explore and test the API:

http://127.0.0.1:8000/docs

The SQLite database tables are created automatically when the application starts.

### 4. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm install bootstrap bootstrap-icons
```

Start the development server:

```bash
npm run dev
```

Open the frontend at:

http://localhost:5173

Keep both backend and frontend servers running while using the application.

## How to Use

1. Open the frontend in your browser.
2. Enter the company name and event name.
3. Select the completion date.
4. Add the recipients' names and email addresses.
5. Submit the form to create a generation job.
6. View the job status and generation results.
7. Open the job details to check individual recipient results.
8. Download successful certificates individually or as a ZIP file.

## API Endpoints

All job endpoints use the `/api/v1` prefix.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check whether the API is running |
| GET | `/health` | Health check |
| POST | `/api/v1/jobs` | Create a certificate generation job |
| GET | `/api/v1/jobs` | List generation jobs |
| GET | `/api/v1/jobs/{job_id}` | Get job details and recipient results |
| GET | `/api/v1/jobs/{job_id}/certificates` | List successful certificates |
| GET | `/api/v1/jobs/{job_id}/certificates/{recipient_id}` | Download an individual PDF |
| GET | `/api/v1/jobs/{job_id}/download` | Download successful certificates as a ZIP |

## Example API Request

**POST** `/api/v1/jobs`

```json
{
  "company_name": "Example Technologies",
  "event_name": "Python Development Training",
  "completion_date": "2026-10-10",
  "recipients": [
    {
      "name": "Rahul Sharma",
      "email": "rahul@example.com"
    },
    {
      "name": "Priya Das",
      "email": "priya@example.com"
    }
  ]
}
```

The API creates a job and returns its ID and initial status. Use the returned job ID to check progress and retrieve the generated certificates.

## Certificate Design

The generated PDFs use a professional Navy and Gold theme.

Each certificate includes:

- Company name
- Certificate of Completion heading
- Recipient name
- Event name
- Completion date
- Unique certificate ID
- Decorative borders and a gold accent

The PDF layout is generated dynamically using ReportLab. Each recipient receives a separate PDF file.

## Database Design

The application uses two main tables.

**GenerationJob**
- Job ID
- Company name
- Event name
- Completion date
- Job status
- Total recipients
- Successful count
- Failed count
- Creation timestamp

**CertificateRecord**
- Certificate record ID
- Associated job ID
- Recipient name
- Recipient email
- Generation status
- PDF file path
- Error message

Each certificate record is linked to its generation job through a foreign key.

## Error Handling and Progress Tracking

The generator processes recipients individually.

- Invalid recipient details are recorded as failures.
- A failed certificate does not stop the processing of other recipients.
- Successful PDF paths and failure messages are stored in the database.
- Job counters are updated as results are processed.
- Jobs finish with `completed`, `completed_with_errors`, or `failed` status, depending on the outcome.

The application uses FastAPI background tasks to process certificate generation after a job is submitted. These are in-process background tasks, not a separate distributed task queue.

## Testing

Run the tests from the backend directory with the virtual environment activated:

```bash
python -m pytest -v
```

The test suite should cover:

- Job creation
- Input validation
- Certificate generation
- Job progress and status
- Handling individual recipient failures
- Certificate retrieval
- ZIP download functionality

Add tests for these scenarios under the `backend/tests/` directory.

## Design Decisions

- **FastAPI:** Provides API endpoints and automatic interactive documentation.
- **SQLite:** Keeps local setup simple without requiring a separate database server.
- **SQLAlchemy:** Manages database models and queries.
- **ReportLab:** Generates PDF certificates programmatically.
- **Individual recipient processing:** Prevents one invalid recipient from stopping the entire job.
- **Database status tracking:** Makes job results available after processing finishes.
- **ZIP downloads:** Allow users to retrieve multiple certificates conveniently.
- **React and Bootstrap:** Provide a responsive interface with reusable UI components.

## Current Limitations

- The application uses a predefined certificate layout rather than a template editor.
- Background processing runs inside the API process; jobs are not managed by a separate task queue.
- SQLite is intended for simple local usage and small workloads.
- Generated PDFs are stored on the local filesystem, so persistent shared storage is needed for many production deployments.
- Authentication, access control, and production-grade deployment configuration may be added as future improvements.

## Future Improvements

- Add user authentication and authorization.
- Support multiple certificate templates.
- Add a certificate verification endpoint.
- Send generated certificates by email.
- Add retry support for failed recipients.
- Use a persistent task queue for larger jobs.
- Add cloud storage for generated PDFs.

## License

This project was developed as a bulk certificate generation application. Add a license file if you intend to distribute or open-source the project.
