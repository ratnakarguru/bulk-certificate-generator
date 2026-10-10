
import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/v1";

const newRecipient = () => ({
  id: crypto.randomUUID(),
  name: "",
  email: "",
});

function Home() {
  const [page, setPage] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [eventName, setEventName] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [recipients, setRecipients] = useState([newRecipient()]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load jobs saved in the database
  async function loadJobs() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/jobs`);

      if (!response.ok) {
        throw new Error("Could not load jobs. Check your backend.");
      }

      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Get the details of a selected job
  async function loadJob(jobId) {
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Could not load job details.");
      }

      const data = await response.json();
      setSelectedJob(data);

      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  // Keep the selected job status up to date
  useEffect(() => {
    if (page !== "details" || !selectedJob?.job_id) {
      return;
    }

    const jobId = selectedJob.job_id;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/jobs/${jobId}`);

        if (response.ok) {
          const data = await response.json();
          setSelectedJob(data);
        }
      } catch {
        // Try again on the next refresh.
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [page, selectedJob?.job_id]);

  function showPage(nextPage) {
    setPage(nextPage);
    setError("");
    setSuccessMessage("");
  }

  function addRecipient() {
    setRecipients((current) => [...current, newRecipient()]);
  }

  function removeRecipient(id) {
    setRecipients((current) => {
      if (current.length === 1) return current;

      return current.filter((recipient) => recipient.id !== id);
    });
  }

  function updateRecipient(id, field, value) {
    setRecipients((current) =>
      current.map((recipient) =>
        recipient.id === id
          ? { ...recipient, [field]: value }
          : recipient
      )
    );
  }

  // Create a certificate generation job
  async function createJob(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!companyName.trim()) {
      setError("Please enter the company name.");
      return;
    }

    if (!eventName.trim()) {
      setError("Please enter the event name.");
      return;
    }

    if (!completionDate) {
      setError("Please select a completion date.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        company_name: companyName.trim(),
        event_name: eventName.trim(),
        completion_date: completionDate,
        recipients: recipients.map(({ name, email }) => ({
          name: name.trim(),
          email: email.trim(),
        })),
      };

      const response = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(detail || "Could not create the job.");
      }

      setCompanyName("");
      setEventName("");
      setCompletionDate("");
      setRecipients([newRecipient()]);

      await loadJobs();

      setSuccessMessage("Generation job created successfully.");
      setPage("details");

      await loadJob(data.job_id);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openJob(jobId) {
    setError("");
    setSuccessMessage("");

    const data = await loadJob(jobId);

    if (data) {
      setPage("details");
    }
  }

  // Download a PDF or ZIP file
  async function downloadFile(url, filename) {
    try {
      setError("");

      const response = await fetch(`http://127.0.0.1:8000${url}`);

      if (!response.ok) {
        let message = "Download failed.";

        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // Use the default message if the response isn't JSON.
        }

        throw new Error(message);
      }

      const file = await response.blob();
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(err.message);
    }
  }

  const totalRecipients = jobs.reduce(
    (total, job) => total + (job.total || 0),
    0
  );

  const successfulCount = jobs.reduce(
    (total, job) => total + (job.successful || 0),
    0
  );

  const failedCount = jobs.reduce(
    (total, job) => total + (job.failed || 0),
    0
  );

  const activeJobs = jobs.filter((job) =>
    ["queued", "processing"].includes(job.status)
  ).length;

  function statusBadge(status) {
    const styles = {
      queued: "bg-secondary",
      processing: "bg-primary",
      completed: "bg-success",
      completed_with_errors: "bg-warning text-dark",
      failed: "bg-danger",
      pending: "bg-secondary",
      success: "bg-success",
    };

    const labels = {
      completed_with_errors: "Completed with errors",
      success: "Success",
    };

    return (
      <span className={`badge ${styles[status] || "bg-secondary"}`}>
        {labels[status] || status || "Unknown"}
      </span>
    );
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="container-fluid">
        <div className="row min-vh-100">

          {/* Sidebar */}
          <aside className="col-md-3 col-lg-2 bg-dark text-white p-3">
            <div className="mb-4 px-2">
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-award-fill fs-3 text-info"></i>
                <h5 className="mb-0">Certify</h5>
              </div>

              <small className="text-white-50">
                Certificate Management
              </small>
            </div>

            <div className="d-grid gap-2">
              <button
                className={`btn text-start ${
                  page === "dashboard"
                    ? "btn-primary"
                    : "btn-dark text-white"
                }`}
                onClick={() => showPage("dashboard")}
              >
                <i className="bi bi-grid me-2"></i>
                Dashboard
              </button>

              <button
                className={`btn text-start ${
                  page === "generate"
                    ? "btn-primary"
                    : "btn-dark text-white"
                }`}
                onClick={() => showPage("generate")}
              >
                <i className="bi bi-file-earmark-plus me-2"></i>
                Generate Certificates
              </button>

              <button
                className={`btn text-start ${
                  page === "jobs" || page === "details"
                    ? "btn-primary"
                    : "btn-dark text-white"
                }`}
                onClick={() => showPage("jobs")}
              >
                <i className="bi bi-clock-history me-2"></i>
                Generation History
              </button>
            </div>

            <div className="border-top border-secondary mt-4 pt-3 px-2">
              <small className="text-white-50">
                Bulk Certificate Generator
              </small>
            </div>
          </aside>

          {/* Main content */}
          <main className="col-md-9 col-lg-10 p-3 p-lg-4">
            <header className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div>
                <h3 className="mb-1">
                  {page === "dashboard" && "Dashboard"}
                  {page === "generate" && "Generate Certificates"}
                  {page === "jobs" && "Generation History"}
                  {page === "details" && "Job Details"}
                </h3>

                <p className="text-secondary mb-0">
                  Manage your certificate generation jobs.
                </p>
              </div>

              <button
                className="btn btn-outline-primary"
                onClick={loadJobs}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </header>

            {/* Error and success messages */}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
                <button
                  type="button"
                  className="btn-close float-end"
                  aria-label="Close"
                  onClick={() => setError("")}
                ></button>
              </div>
            )}

            {successMessage && (
              <div className="alert alert-success">
                {successMessage}
              </div>
            )}

            {/* Dashboard */}
            {page === "dashboard" && (
              <>
                <div className="row g-3 mb-4">
                  <div className="col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <span className="text-secondary">Total Jobs</span>
                        <h2 className="mt-3">{jobs.length}</h2>
                        <small className="text-secondary">
                          All generation jobs
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <span className="text-secondary">Recipients</span>
                        <h2 className="mt-3">{totalRecipients}</h2>
                        <small className="text-secondary">
                          Total recipients submitted
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <span className="text-secondary">Successful</span>
                        <h2 className="mt-3 text-success">
                          {successfulCount}
                        </h2>
                        <small className="text-secondary">
                          Certificates generated
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <span className="text-secondary">Failed</span>
                        <h2 className="mt-3 text-danger">{failedCount}</h2>
                        <small className="text-secondary">
                          Failed recipients
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                      <h5>Create a new batch</h5>
                      <p className="text-secondary mb-0">
                        Generate certificates for multiple recipients.
                      </p>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={() => showPage("generate")}
                    >
                      <i className="bi bi-plus-lg me-2"></i>
                      New Generation Job
                    </button>
                  </div>
                </div>

                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Recent Jobs</h5>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => showPage("jobs")}
                      >
                        View All
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Company</th>
                            <th>Event</th>
                            <th>Recipients</th>
                            <th>Successful</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>

                        <tbody>
                          {jobs.slice(0, 5).map((job) => (
                            <tr key={job.job_id}>
                              <td>{job.company_name || "—"}</td>
                              <td>{job.event_name}</td>
                              <td>{job.total}</td>
                              <td>{job.successful}</td>
                              <td>{statusBadge(job.status)}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => openJob(job.job_id)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}

                          {jobs.length === 0 && (
                            <tr>
                              <td colSpan="6" className="text-center py-4 text-secondary">
                                No jobs yet. Create your first batch.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {activeJobs > 0 && (
                      <p className="small text-secondary mb-0">
                        {activeJobs} job(s) are still processing.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Generate certificates */}
            {page === "generate" && (
              <form onSubmit={createJob}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h5 className="mb-3">Certificate Information</h5>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Company Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. ABC Technologies"
                          value={companyName}
                          onChange={(event) =>
                            setCompanyName(event.target.value)
                          }
                          maxLength={200}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Event or Course Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Python Programming Course"
                          value={eventName}
                          onChange={(event) =>
                            setEventName(event.target.value)
                          }
                          maxLength={200}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Completion Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={completionDate}
                          onChange={(event) =>
                            setCompletionDate(event.target.value)
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <div>
                        <h5 className="mb-1">Recipients</h5>
                        <p className="text-secondary small mb-0">
                          Add everyone who needs a certificate.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={addRecipient}
                        disabled={recipients.length >= 1000}
                      >
                        <i className="bi bi-plus-lg me-2"></i>
                        Add Recipient
                      </button>
                    </div>

                    {recipients.map((recipient, index) => (
                      <div
                        className="row g-3 align-items-end border-bottom py-3"
                        key={recipient.id}
                      >
                        <div className="col-md-1">
                          <span className="text-secondary">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="col-md-5">
                          <label className="form-label">Recipient Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Full name"
                            value={recipient.name}
                            onChange={(event) =>
                              updateRecipient(
                                recipient.id,
                                "name",
                                event.target.value
                              )
                            }
                            maxLength={200}
                          />
                        </div>

                        <div className="col-md-5">
                          <label className="form-label">Email Address</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="name@example.com"
                            value={recipient.email}
                            onChange={(event) =>
                              updateRecipient(
                                recipient.id,
                                "email",
                                event.target.value
                              )
                            }
                            maxLength={254}
                          />
                        </div>

                        <div className="col-md-1">
                          <button
                            type="button"
                            className="btn btn-outline-danger w-100"
                            title="Remove recipient"
                            aria-label={`Remove recipient ${index + 1}`}
                            onClick={() => removeRecipient(recipient.id)}
                            disabled={recipients.length === 1}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}

                    <p className="small text-secondary mt-3 mb-0">
                      Invalid recipient details can be used to test partial
                      failures. Other valid recipients can still be processed.
                    </p>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => showPage("dashboard")}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating Job...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-pdf me-2"></i>
                        Generate Certificates
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Generation history */}
            {page === "jobs" && (
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Company</th>
                          <th>Event Name</th>
                          <th>Recipients</th>
                          <th>Successful</th>
                          <th>Failed</th>
                          <th>Created At</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.job_id}>
                            <td>{job.company_name || "—"}</td>
                            <td>{job.event_name}</td>
                            <td>{job.total}</td>
                            <td>{job.successful}</td>
                            <td>{job.failed}</td>
                            <td>{formatDate(job.created_at)}</td>
                            <td>{statusBadge(job.status)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openJob(job.job_id)}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}

                        {jobs.length === 0 && (
                          <tr>
                            <td colSpan="8" className="text-center py-4 text-secondary">
                              {loading ? "Loading jobs..." : "No jobs found."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Job details */}
            {page === "details" && (
              <>
                {!selectedJob ? (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                      <p className="text-secondary">No job selected.</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => showPage("jobs")}
                      >
                        Back to Jobs
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card border-0 shadow-sm mb-4">
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                          <div>
                            <h5 className="mb-2">
                              {selectedJob.company_name || "Company"}
                            </h5>

                            <p className="mb-1">
                              <strong>Event:</strong> {selectedJob.event_name}
                            </p>

                            <p className="text-secondary mb-1">
                              <strong>Completion Date:</strong>{" "}
                              {selectedJob.completion_date}
                            </p>

                            <p className="text-secondary mb-0">
                              <strong>Job ID:</strong>{" "}
                              <span className="font-monospace small">
                                {selectedJob.job_id}
                              </span>
                            </p>
                          </div>

                          {statusBadge(selectedJob.status)}
                        </div>

                        <hr />

                        <div className="row g-3">
                          <div className="col-6 col-lg-3">
                            <small className="text-secondary">Total</small>
                            <h4>{selectedJob.total}</h4>
                          </div>

                          <div className="col-6 col-lg-3">
                            <small className="text-secondary">Processed</small>
                            <h4>{selectedJob.processed}</h4>
                          </div>

                          <div className="col-6 col-lg-3">
                            <small className="text-secondary">Successful</small>
                            <h4 className="text-success">
                              {selectedJob.successful}
                            </h4>
                          </div>

                          <div className="col-6 col-lg-3">
                            <small className="text-secondary">Failed</small>
                            <h4 className="text-danger">
                              {selectedJob.failed}
                            </h4>
                          </div>
                        </div>

                        {selectedJob.total > 0 && (
                          <div
                            className="progress mt-2"
                            style={{ height: "8px" }}
                          >
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{
                                width: `${
                                  (selectedJob.processed /
                                    selectedJob.total) *
                                  100
                                }%`,
                              }}
                              aria-valuenow={selectedJob.processed}
                              aria-valuemin="0"
                              aria-valuemax={selectedJob.total}
                            ></div>
                          </div>
                        )}

                        <div className="d-flex justify-content-between flex-wrap gap-2 mt-4">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => showPage("jobs")}
                          >
                            <i className="bi bi-arrow-left me-2"></i>
                            Back to History
                          </button>

                          <button
                            className="btn btn-success"
                            onClick={() =>
                              downloadFile(
                                `/api/v1/jobs/${selectedJob.job_id}/download`,
                                `certificates-${selectedJob.job_id}.zip`
                              )
                            }
                          >
                            <i className="bi bi-file-zip me-2"></i>
                            Download All (ZIP)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <h5 className="mb-3">Recipient Results</h5>

                        <div className="table-responsive">
                          <table className="table table-hover align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Error</th>
                                <th>Download</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(selectedJob.results || []).map((record) => (
                                <tr key={record.recipient_id}>
                                  <td>{record.name || "—"}</td>
                                  <td>{record.email || "—"}</td>
                                  <td>{statusBadge(record.status)}</td>
                                  <td>
                                    {record.error ? (
                                      <span className="text-danger small">
                                        {record.error}
                                      </span>
                                    ) : (
                                      <span className="text-secondary">—</span>
                                    )}
                                  </td>
                                  <td>
                                    {record.status === "success" ? (
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() =>
                                          downloadFile(
                                            `/api/v1/jobs/${selectedJob.job_id}/certificates/${record.recipient_id}`,
                                            `certificate-${record.recipient_id}.pdf`
                                          )
                                        }
                                      >
                                        <i className="bi bi-download me-1"></i>
                                        PDF
                                      </button>
                                    ) : (
                                      <span className="text-secondary">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {(selectedJob.results || []).length === 0 && (
                                <tr>
                                  <td colSpan="5" className="text-center py-4 text-secondary">
                                    No recipient results available.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Home;
