import React, { useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://black-cheetah-backend.onrender.com/";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [createEmployeeForm, setCreateEmployeeForm] = useState({
    username: "",
    password: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedToName: "",
  });

  const [employeeForm, setEmployeeForm] = useState({
    expense: "",
    contact: "",
    orderDetails: "",
    location: "",
    billImage: null,
    shopImage: null,
    employeeImage: null,
  });

  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");

  // Global search
  const [globalSearch, setGlobalSearch] = useState("");

  // Employee filters
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Task filters
  const [taskSearch, setTaskSearch] = useState("");
  const [taskEmployeeFilter, setTaskEmployeeFilter] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskDateFrom, setTaskDateFrom] = useState("");
  const [taskDateTo, setTaskDateTo] = useState("");

  // Report filters
  const [reportSearch, setReportSearch] = useState("");
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const authHeader = {
    headers: {
      Authorization: token,
    },
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API}/login`, loginForm);

      setToken(res.data.token);
      setRole(res.data.role);
      setUsername(res.data.username);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);

      setMessage("Login successful");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Login failed");
    }
  };

  const logout = () => {
    setToken("");
    setRole("");
    setUsername("");
    setReports([]);
    setEmployees([]);
    setAllTasks([]);
    setEmployeeTasks([]);
    setNotifications([]);
    localStorage.clear();
    setMessage("Logged out");
  };

  const createEmployee = async () => {
    try {
      const res = await axios.post(
        `${API}/create-employee`,
        createEmployeeForm,
        authHeader
      );
      setMessage(res.data.message);
      setCreateEmployeeForm({ username: "", password: "" });
      loadEmployees();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to create employee");
    }
  };

  const deleteEmployee = async (employeeId) => {
    const ok = window.confirm("Are you sure you want to remove this employee?");
    if (!ok) return;

    try {
      const res = await axios.delete(`${API}/employees/${employeeId}`, authHeader);
      setMessage(res.data.message);
      loadEmployees();
      loadAllTasks();
      loadReports();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to remove employee");
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`, authHeader);
      setEmployees(res.data);
      setMessage("Employees loaded");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load employees");
    }
  };

  const assignTask = async () => {
    try {
      const res = await axios.post(`${API}/task`, taskForm, authHeader);
      setMessage(res.data.message);
      setTaskForm({
        title: "",
        description: "",
        assignedToName: "",
      });
      loadAllTasks();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Task assignment failed");
    }
  };

  const loadAllTasks = async () => {
    try {
      const res = await axios.get(`${API}/all-tasks`, authHeader);
      setAllTasks(res.data);
      setMessage("Tasks loaded");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load tasks");
    }
  };

  const loadEmployeeTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks`, authHeader);
      setEmployeeTasks(res.data);
      setMessage("My tasks loaded");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load my tasks");
    }
  };

  const completeTask = async (taskId) => {
    try {
      const res = await axios.patch(
        `${API}/tasks/${taskId}/complete`,
        {},
        authHeader
      );
      setMessage(res.data.message);
      loadEmployeeTasks();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to complete task");
    }
  };

  const submitEmployeeReport = async () => {
    try {
      const formData = new FormData();
      formData.append("expense", employeeForm.expense);
      formData.append("contact", employeeForm.contact);
      formData.append("orderDetails", employeeForm.orderDetails);
      formData.append("location", employeeForm.location);

      if (employeeForm.billImage) formData.append("billImage", employeeForm.billImage);
      if (employeeForm.shopImage) formData.append("shopImage", employeeForm.shopImage);
      if (employeeForm.employeeImage) formData.append("employeeImage", employeeForm.employeeImage);

      await axios.post(`${API}/report`, formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("Report submitted successfully");
      setEmployeeForm({
        expense: "",
        contact: "",
        orderDetails: "",
        location: "",
        billImage: null,
        shopImage: null,
        employeeImage: null,
      });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Report submission failed");
    }
  };

  const loadReports = async () => {
    try {
      const res = await axios.get(`${API}/reports`, authHeader);
      setReports(res.data);
      setMessage("Reports loaded");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load reports");
    }
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      const res = await axios.patch(
        `${API}/reports/${reportId}/status`,
        { status },
        authHeader
      );
      setMessage(res.data.message);
      loadReports();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to update report");
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications`, authHeader);
      setNotifications(res.data);
      setMessage("Notifications loaded");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load notifications");
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await axios.patch(`${API}/notifications/${id}/read`, {}, authHeader);
      loadNotifications();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to update notification");
    }
  };

  const formatImageUrl = (filePath) => {
    if (!filePath) return "";
    return `${API}/${filePath.replace(/\\/g, "/")}`;
  };

  const dateInRange = (dateValue, from, to) => {
    if (!dateValue) return true;
    const itemDate = new Date(dateValue);
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      if (itemDate < fromDate) return false;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (itemDate > toDate) return false;
    }
    return true;
  };

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    const g = globalSearch.trim().toLowerCase();

    return employees.filter((emp) => {
      const text = `${emp.username} ${emp.role} ${emp._id}`.toLowerCase();
      const localMatch = q ? text.includes(q) : true;
      const globalMatch = g ? text.includes(g) : true;
      return localMatch && globalMatch;
    });
  }, [employees, employeeSearch, globalSearch]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    const g = globalSearch.trim().toLowerCase();

    return allTasks.filter((task) => {
      const text = `${task.title} ${task.description} ${task.assignedToName} ${task.assignedBy}`.toLowerCase();

      const searchMatch = q ? text.includes(q) : true;
      const globalMatch = g ? text.includes(g) : true;
      const employeeMatch = taskEmployeeFilter
        ? task.assignedToName === taskEmployeeFilter
        : true;
      const statusMatch =
        taskStatusFilter === "all"
          ? true
          : taskStatusFilter === "completed"
          ? task.completed === true
          : task.completed === false;

      const dateMatch = dateInRange(task.createdAt, taskDateFrom, taskDateTo);

      return searchMatch && globalMatch && employeeMatch && statusMatch && dateMatch;
    });
  }, [
    allTasks,
    taskSearch,
    globalSearch,
    taskEmployeeFilter,
    taskStatusFilter,
    taskDateFrom,
    taskDateTo,
  ]);

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    const g = globalSearch.trim().toLowerCase();

    return reports.filter((report) => {
      const text =
        `${report.employeeName} ${report.contact} ${report.orderDetails} ${report.location} ${report.status}`.toLowerCase();

      const searchMatch = q ? text.includes(q) : true;
      const globalMatch = g ? text.includes(g) : true;
      const employeeMatch = reportEmployeeFilter
        ? report.employeeName === reportEmployeeFilter
        : true;
      const statusMatch =
        reportStatusFilter === "all"
          ? true
          : report.status === reportStatusFilter;

      const dateMatch = dateInRange(report.createdAt, reportDateFrom, reportDateTo);

      return searchMatch && globalMatch && employeeMatch && statusMatch && dateMatch;
    });
  }, [
    reports,
    reportSearch,
    globalSearch,
    reportEmployeeFilter,
    reportStatusFilter,
    reportDateFrom,
    reportDateTo,
  ]);

  const employeeNames = useMemo(
    () => [...new Set(employees.map((e) => e.username))],
    [employees]
  );

  const reportEmployeeNames = useMemo(
    () => [...new Set(reports.map((r) => r.employeeName).filter(Boolean))],
    [reports]
  );

  if (!token) {
    return (
      <div className="page center-page">
        <div className="panel login-panel">
          <div className="logo-line">
            <div className="logo-dot" />
            <h1>BLACK CHEETAH</h1>
          </div>
          <p className="subtext dark-subtext">Marketing employee management system</p>

          <input
            className="input"
            placeholder="Username"
            value={loginForm.username}
            onChange={(e) =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
          />

          <button className="primary-btn" onClick={handleLogin}>
            Login
          </button>

          {message && <div className="message-box">{message}</div>}
        </div>
      </div>
    );
  }

  if (role === "employee") {
    return (
      <div className="page">
        <div className="topbar">
          <div>
            <h1>BLACK CHEETAH</h1>
            <p className="subtext">Employee Panel · {username}</p>
          </div>

          <div className="topbar-actions">
            <button className="secondary-btn" onClick={loadEmployeeTasks}>
              Load My Tasks
            </button>
            <button className="danger-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {message && <div className="message-box">{message}</div>}

        <div className="grid two-col">
          <div className="panel">
            <h2>Submit Report</h2>

            <input
              className="input"
              placeholder="Expense Amount"
              value={employeeForm.expense}
              onChange={(e) =>
                setEmployeeForm({ ...employeeForm, expense: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="Contact Number"
              value={employeeForm.contact}
              onChange={(e) =>
                setEmployeeForm({ ...employeeForm, contact: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="Order Details"
              value={employeeForm.orderDetails}
              onChange={(e) =>
                setEmployeeForm({
                  ...employeeForm,
                  orderDetails: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Location / Shop Name"
              value={employeeForm.location}
              onChange={(e) =>
                setEmployeeForm({ ...employeeForm, location: e.target.value })
              }
            />

            <label className="label">Bill Image</label>
            <input
              type="file"
              onChange={(e) =>
                setEmployeeForm({
                  ...employeeForm,
                  billImage: e.target.files[0],
                })
              }
            />

            <label className="label">Shop / Banner Image</label>
            <input
              type="file"
              onChange={(e) =>
                setEmployeeForm({
                  ...employeeForm,
                  shopImage: e.target.files[0],
                })
              }
            />

            <label className="label">Employee Image</label>
            <input
              type="file"
              onChange={(e) =>
                setEmployeeForm({
                  ...employeeForm,
                  employeeImage: e.target.files[0],
                })
              }
            />

            <button className="primary-btn" onClick={submitEmployeeReport}>
              Submit Report
            </button>
          </div>

          <div className="panel">
            <h2>My Tasks</h2>

            {employeeTasks.length === 0 ? (
              <p className="muted">No tasks loaded yet.</p>
            ) : (
              employeeTasks.map((task) => (
                <div className="task-card" key={task._id}>
                  <p><strong>Title:</strong> {task.title}</p>
                  <p><strong>Description:</strong> {task.description}</p>
                  <p><strong>Assigned By:</strong> {task.assignedBy}</p>
                  <p>
                    <strong>Status:</strong> {task.completed ? "Completed" : "Pending"}
                  </p>

                  {!task.completed && (
                    <button
                      className="primary-btn small-btn"
                      onClick={() => completeTask(task._id)}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>BLACK CHEETAH</h1>
          <p className="subtext">Admin Dashboard · {username}</p>
        </div>

        <div className="topbar-actions">
          <button className="secondary-btn" onClick={loadEmployees}>
            Employees
          </button>
          <button className="secondary-btn" onClick={loadReports}>
            Reports
          </button>
          <button className="secondary-btn" onClick={loadAllTasks}>
            Tasks
          </button>
          <button className="secondary-btn" onClick={loadNotifications}>
            Notifications
          </button>
          <button className="danger-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Global Search</h2>
        <input
          className="input"
          placeholder="Search employees, tasks, reports..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
        />
      </div>

      {message && <div className="message-box">{message}</div>}

      <div className="grid two-col">
        <div className="panel">
          <h2>Create Employee</h2>

          <input
            className="input"
            placeholder="Employee Username"
            value={createEmployeeForm.username}
            onChange={(e) =>
              setCreateEmployeeForm({
                ...createEmployeeForm,
                username: e.target.value,
              })
            }
          />

          <input
            className="input"
            type="password"
            placeholder="Employee Password"
            value={createEmployeeForm.password}
            onChange={(e) =>
              setCreateEmployeeForm({
                ...createEmployeeForm,
                password: e.target.value,
              })
            }
          />

          <button className="primary-btn" onClick={createEmployee}>
            Create Employee
          </button>

          <h3 className="section-title">Employee Search</h3>
          <input
            className="input"
            placeholder="Search employee"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
          />

          <h3 className="section-title">Employee List</h3>

          {filteredEmployees.length === 0 ? (
            <p className="muted">No employees found.</p>
          ) : (
            filteredEmployees.map((emp) => (
              <div className="task-card" key={emp._id}>
                <p><strong>Username:</strong> {emp.username}</p>
                <p><strong>ID:</strong> {emp._id}</p>

                <button
                  className="danger-btn small-btn"
                  onClick={() => deleteEmployee(emp._id)}
                >
                  Remove Employee
                </button>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <h2>Assign Task</h2>

          <input
            className="input"
            placeholder="Task Title"
            value={taskForm.title}
            onChange={(e) =>
              setTaskForm({ ...taskForm, title: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Task Description"
            value={taskForm.description}
            onChange={(e) =>
              setTaskForm({ ...taskForm, description: e.target.value })
            }
          />

          <label className="label">Select Employee</label>
          <select
            className="input"
            value={taskForm.assignedToName}
            onChange={(e) =>
              setTaskForm({ ...taskForm, assignedToName: e.target.value })
            }
          >
            <option value="">Choose employee</option>
            {employeeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <button className="primary-btn" onClick={assignTask}>
            Assign Task
          </button>

          <h3 className="section-title">Notifications</h3>

          {notifications.length === 0 ? (
            <p className="muted">No notifications loaded yet.</p>
          ) : (
            notifications.map((n) => (
              <div className="task-card" key={n._id}>
                <p><strong>{n.title}</strong></p>
                <p>{n.message}</p>
                <p><strong>Status:</strong> {n.read ? "Read" : "Unread"}</p>

                {!n.read && (
                  <button
                    className="secondary-btn small-btn"
                    onClick={() => markNotificationRead(n._id)}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Tasks</h2>

        <div className="filter-grid">
          <input
            className="input"
            placeholder="Search tasks"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
          />

          <select
            className="input"
            value={taskEmployeeFilter}
            onChange={(e) => setTaskEmployeeFilter(e.target.value)}
          >
            <option value="">All Employees</option>
            {employeeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={taskStatusFilter}
            onChange={(e) => setTaskStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
          </select>

          <input
            className="input"
            type="date"
            value={taskDateFrom}
            onChange={(e) => setTaskDateFrom(e.target.value)}
          />

          <input
            className="input"
            type="date"
            value={taskDateTo}
            onChange={(e) => setTaskDateTo(e.target.value)}
          />
        </div>

        {filteredTasks.length === 0 ? (
          <p className="muted">No tasks found.</p>
        ) : (
          filteredTasks.map((task) => (
            <div className="task-card" key={task._id}>
              <p><strong>Title:</strong> {task.title}</p>
              <p><strong>Description:</strong> {task.description}</p>
              <p><strong>Assigned To:</strong> {task.assignedToName}</p>
              <p><strong>Assigned By:</strong> {task.assignedBy}</p>
              <p><strong>Status:</strong> {task.completed ? "Completed" : "Pending"}</p>
              <p><strong>Date:</strong> {new Date(task.createdAt).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <h2>Reports</h2>

        <div className="filter-grid">
          <input
            className="input"
            placeholder="Search reports"
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
          />

          <select
            className="input"
            value={reportEmployeeFilter}
            onChange={(e) => setReportEmployeeFilter(e.target.value)}
          >
            <option value="">All Employees</option>
            {reportEmployeeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={reportStatusFilter}
            onChange={(e) => setReportStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            className="input"
            type="date"
            value={reportDateFrom}
            onChange={(e) => setReportDateFrom(e.target.value)}
          />

          <input
            className="input"
            type="date"
            value={reportDateTo}
            onChange={(e) => setReportDateTo(e.target.value)}
          />
        </div>

        {filteredReports.length === 0 ? (
          <p className="muted">No reports found.</p>
        ) : (
          filteredReports.map((report) => (
            <div className="report-card" key={report._id}>
              <div className="report-grid">
                <div>
                  <p><strong>Employee:</strong> {report.employeeName}</p>
                  <p><strong>Expense:</strong> ₹{report.expense}</p>
                  <p><strong>Contact:</strong> {report.contact}</p>
                  <p><strong>Order Details:</strong> {report.orderDetails}</p>
                  <p><strong>Location:</strong> {report.location}</p>
                  <p><strong>AI Verified:</strong> {report.verified ? "Yes" : "No"}</p>
                  <p><strong>AI Reason:</strong> {report.verificationReason}</p>
                  <p><strong>Status:</strong> {report.status}</p>
                  <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleString()}</p>

                  <div className="button-row">
                    <button
                      className="primary-btn small-btn"
                      onClick={() => updateReportStatus(report._id, "approved")}
                    >
                      Approve
                    </button>

                    <button
                      className="danger-btn small-btn"
                      onClick={() => updateReportStatus(report._id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="image-grid">
                  <div className="image-box">
                    <p>Bill</p>
                    {report.billImage && (
                      <img
                        src={formatImageUrl(report.billImage)}
                        alt="Bill"
                        className="report-image"
                      />
                    )}
                  </div>

                  <div className="image-box">
                    <p>Shop</p>
                    {report.shopImage && (
                      <img
                        src={formatImageUrl(report.shopImage)}
                        alt="Shop"
                        className="report-image"
                      />
                    )}
                  </div>

                  <div className="image-box">
                    <p>Employee</p>
                    {report.employeeImage && (
                      <img
                        src={formatImageUrl(report.employeeImage)}
                        alt="Employee"
                        className="report-image"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;