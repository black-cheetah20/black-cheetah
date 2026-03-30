require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(err));

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "employee"], required: true },
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    employeeId: String,
    employeeName: String,
    expense: String,
    contact: String,
    orderDetails: String,
    location: String,
    billImage: String,
    shopImage: String,
    employeeImage: String,
    verified: Boolean,
    verificationReason: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    assignedToId: String,
    assignedToName: String,
    assignedBy: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    type: String,
    title: String,
    message: String,
    forAdmin: { type: Boolean, default: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const imageHashSchema = new mongoose.Schema(
  {
    fileHash: { type: String, unique: true },
    originalPath: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Report = mongoose.model("Report", reportSchema);
const Task = mongoose.model("Task", taskSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const ImageHash = mongoose.model("ImageHash", imageHashSchema);

function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = user;
    next();
  });
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("Black Cheetah Backend Running");
});

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});

const upload = multer({ storage });

async function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Basic authenticity checker
async function verifySingleImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
      return { ok: false, reason: "Invalid image file" };
    }

    if (metadata.width < 200 || metadata.height < 200) {
      return { ok: false, reason: "Image resolution too low" };
    }

    const hash = await getFileHash(filePath);
    const existing = await ImageHash.findOne({ fileHash: hash });

    if (existing) {
      return { ok: false, reason: "Duplicate image detected" };
    }

    await ImageHash.create({
      fileHash: hash,
      originalPath: filePath,
    });

    return { ok: true, reason: "Image passed basic authenticity checks" };
  } catch (err) {
    return { ok: false, reason: "Unreadable or suspicious image" };
  }
}

async function verifyReportImages(files) {
  const checks = [];

  if (files.billImage?.[0]?.path) {
    checks.push(verifySingleImage(files.billImage[0].path));
  }
  if (files.shopImage?.[0]?.path) {
    checks.push(verifySingleImage(files.shopImage[0].path));
  }
  if (files.employeeImage?.[0]?.path) {
    checks.push(verifySingleImage(files.employeeImage[0].path));
  }

  const results = await Promise.all(checks);
  const failed = results.find((r) => !r.ok);

  if (failed) {
    return { verified: false, reason: failed.reason };
  }

  return { verified: true, reason: "All uploaded images passed basic checks" };
}

// Initial user creation if needed
app.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      username: req.body.username,
      password: hashed,
      role: req.body.role,
    });

    await user.save();
    res.json({ message: "User Created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to register user" });
  }
});

// Admin creates employee
app.post("/create-employee", auth, adminOnly, async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      username: req.body.username,
      password: hashed,
      role: "employee",
    });

    await user.save();

    res.json({
      message: "Employee created successfully",
      employee: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create employee" });
  }
});

// Remove employee and related data
app.delete("/employees/:id", auth, adminOnly, async (req, res) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employeeId = employee._id.toString();

    const reports = await Report.find({ employeeId });

    for (const report of reports) {
      [report.billImage, report.shopImage, report.employeeImage].forEach((file) => {
        if (file && fs.existsSync(path.resolve(file))) {
          try {
            fs.unlinkSync(path.resolve(file));
          } catch (_) {}
        }
      });
    }

    await Task.deleteMany({ assignedToId: employeeId });
    await Report.deleteMany({ employeeId });
    await User.findByIdAndDelete(employee._id);

    res.json({ message: "Employee removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove employee" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(req.body.password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        username: user.username,
      },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      role: user.role,
      username: user.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/employees", auth, adminOnly, async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select("_id username role createdAt")
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load employees" });
  }
});

app.post(
  "/report",
  auth,
  upload.fields([
    { name: "billImage" },
    { name: "shopImage" },
    { name: "employeeImage" },
  ]),
  async (req, res) => {
    try {
      const verification = await verifyReportImages(req.files || {});

      const report = new Report({
        employeeId: req.user.id,
        employeeName: req.user.username,
        expense: req.body.expense,
        contact: req.body.contact,
        orderDetails: req.body.orderDetails,
        location: req.body.location,
        billImage: req.files?.billImage?.[0]?.path || "",
        shopImage: req.files?.shopImage?.[0]?.path || "",
        employeeImage: req.files?.employeeImage?.[0]?.path || "",
        verified: verification.verified,
        verificationReason: verification.reason,
        status: "pending",
      });

      await report.save();
      res.json(report);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Report submission failed" });
    }
  }
);

// Admin loads all reports
app.get("/reports", auth, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load reports" });
  }
});

// Employee loads own reports
app.get("/my-reports", auth, async (req, res) => {
  try {
    const reports = await Report.find({ employeeId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load employee reports" });
  }
});

// Admin approves or rejects report
app.patch("/reports/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ message: `Report ${status}`, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update report" });
  }
});

// Admin assigns task by employee username
app.post("/task", auth, adminOnly, async (req, res) => {
  try {
    const employee = await User.findOne({
      username: req.body.assignedToName,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const task = new Task({
      title: req.body.title,
      description: req.body.description,
      assignedToId: employee._id.toString(),
      assignedToName: employee.username,
      assignedBy: req.user.username,
    });

    await task.save();
    res.json({ message: "Task assigned successfully", task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to assign task" });
  }
});

// Employee loads own tasks
app.get("/tasks", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedToId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load tasks" });
  }
});

// Admin loads all tasks
app.get("/all-tasks", auth, adminOnly, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load all tasks" });
  }
});

// Employee completes task
app.patch("/tasks/:id/complete", auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      assignedToId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.completed = true;
    task.completedAt = new Date();
    await task.save();

    await Notification.create({
      type: "task_completed",
      title: "Task Completed",
      message: `${req.user.username} completed task: ${task.title}`,
      forAdmin: true,
      read: false,
    });

    res.json({ message: "Task marked as completed", task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to complete task" });
  }
});

app.get("/notifications", auth, adminOnly, async (req, res) => {
  try {
    const notifications = await Notification.find({ forAdmin: true }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

app.patch("/notifications/:id/read", auth, adminOnly, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// Daily cleanup for expired report files
cron.schedule("0 2 * * *", async () => {
  try {
    const expiredReports = await Report.find({
      expiresAt: { $lte: new Date() },
    });

    for (const report of expiredReports) {
      [report.billImage, report.shopImage, report.employeeImage].forEach((file) => {
        if (file && fs.existsSync(path.resolve(file))) {
          try {
            fs.unlinkSync(path.resolve(file));
          } catch (_) {}
        }
      });

      await Report.findByIdAndDelete(report._id);
    }

    console.log("Expired reports cleanup finished");
  } catch (error) {
    console.error("Cleanup failed", error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});