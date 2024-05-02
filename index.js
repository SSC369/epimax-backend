import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
dotenv.config({ path: "./.env" });
import User from "./models/userSchema.js";
import Task from "./models/taskSchema.js";
import fetchUser from "./middlewares/fetchUser.js";
import { v4 } from "uuid";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import jwt from "jsonwebtoken";

const app = express();
//accepts the data in form of JSON
app.use(express.json());

app.listen(3000, () => {
  console.log("server is running on 3000 port");
});

const connecToMongo = async () => {
  try {
    const uri = process.env.MONGODB_CONNECTION_STRING;
    await mongoose.connect(uri);
    console.log("Connected to mongoDB successfully");
  } catch (error) {
    console.log(error);
  }
};

connecToMongo();

//user registration
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    //check that is there a same username exits
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck) {
      return res.status(401).json({ msg: "Username already used !" });
    }

    //create hashed pass
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //adding user details in database
    const user = await User.create({
      id: username + v4(),
      username,
      password_hash: hashedPassword,
    });

    const secretKey = "SSC";

    const payload = {
      assignee_id: user._id,
    };

    const jwtToken = await jwt.sign(payload, secretKey);

    return res.status(201).json({ jwtToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "User registration failed :(" });
  }
});

//user login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    //authentication for user
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ msg: "User is not registered!" });

    //check whether user entered password is same as the password which is in database

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid)
      return res.status(401).json({ msg: "Incorrect Password :(" });

    const secretKey = "SSC";

    //user details can be sent through payload in form of jwttoken
    const payload = {
      assignee_id: user._id,
    };
    const jwtToken = await jwt.sign(payload, secretKey);

    return res.status(200).json({ jwtToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "User login is failed :(" });
  }
});

//creating a task
app.post("/api/tasks", fetchUser, async (req, res) => {
  try {
    const { title, description, status } = req.body;

    const assignee_id = req.user.assignee_id;

    const user = await User.findById(assignee_id);
    await Task.create({
      title,
      description,
      status,
      created_at: new Date(),
      updated_at: new Date(),
      assignee_id,
      id: v4(),
    });

    return res.status(201).json({ msg: "Task created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Task creation is failed :(" });
  }
});

//updating a specific task
app.put("/api/tasks/:id", fetchUser, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const { id } = req.params;
    const assignee_id = req.user.assignee_id;

    const findTask = await Task.findOne({ id, assignee_id });
    if (!findTask)
      return res.status(403).json({ msg: "Can update only your tasks" });

    await Task.updateOne(
      { id },
      {
        $set: {
          title,
          description,
          status,
        },
      }
    );
    return res.status(201).json({ msg: "Task Updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "task updation is failed :(" });
  }
});

//retrieving all tasks from database
app.get("/api/tasks", fetchUser, async (req, res) => {
  try {
    const assignee_id = req.user.assignee_id;
    const tasks = await Task.find({ assignee_id });
    return res.status(200).json({ tasks });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Retrieving  tasks failed :(" });
  }
});

//retrieving a specific task from database
app.get("/api/tasks/:id", fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ id });
    return res.status(200).json({ task });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Retrieving a task is failed :(" });
  }
});

//deleting a task
app.delete("/api/tasks/:id", fetchUser, async (req, res) => {
  try {
    const { id } = req.params;

    await Task.deleteOne({ id });
    return res.status(200).json({ msg: "Task deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Task delete operation failed :(" });
  }
});

//swagger backend documentation

const swaggerDocument = YAML.load("./info.yaml");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
