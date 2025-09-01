const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in your .env file");
}
mongoose.connect(MONGO_URI);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  age: { type: Number, required: true },
  code: { type: String, required: true },
  role: { type: String, enum: ["student", "admin"], default: "student" },
});

const petSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);
const Pet = mongoose.model("Pet", petSchema);

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function shuffleString(str) {
  return str.split("").sort(() => Math.random() - 0.5).join("");
}

app.get("/", (req, res) => {
    res.send("This URL is for backend setup only. Create new data with the username (your surname) and a password (not real password) as a request body with /signup as an endpoint to get the answer in number 1. The answer format is ITMC{answer}.");
});


app.post("/signup", async (req, res) => {
  const { username, password, age } = req.body || {};
  if (!username || !password || !age) {
    return res.status(400).json({
      message: `ITMC{1. ${password}} Uh oh, your instructor must be lying to you. May be you should add more request body? Age is required.`
    });
  }
  const code = generateCode();
  const user = await User.create({ username, password, age, code });
  return res.status(201).json({
    message: `ITMC{2. ${code}} To proceed to number 2, login using your username and password in endpoint /login. Save your 6 character code and ID, you WILL be needing this in other steps. I wont be showing it in queries anymore.`,
    id: user._id.toString(),
    code,
  });
});


app.post("/login", async (req, res) => {
  const { username, password, authKey } = req.body || {};
  if (!authKey) {
    return res.status(401).json({
      message: "ITMC{3. No trespassing!} Ooppsss, logging in is not authorized. May be you need to add one more request body? How about authentication key? Is it Authkey, authentication_key, or authKey?",
    });
  }
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  if (authKey !== user.code) {
    return res.status(401).json({
      message: "Invalid authentication key",
    });
  }
  return res.status(200).json({
    message: `ITMC{4. ${shuffleString(user.code)}} Congrats! Now, can you edit your username in /users? Take note that you need to search for specific data before editing the username, so /users might not be the correct endpoint. Maybe you can add something more than that?`,
  });
});

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "At least one field to update is required" });
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (updates.username) {
    return res.status(200).json({
      message: `Wow! Congrats! You successfully edited your username! ITMC{5. ${user.username}_${shuffleString(user.code)}}. Now, do you have a pet? If yes, add a pet using the Add button… Oh, there’s no Add button to save you here? Maybe send a request to the endpoint /pets/new.`,
    });
  }

  if (updates.role && !["student", "admin"].includes(updates.role)) {
    return res.status(400).json({
        message: "Invalid role!"
    });
    }
  if (updates.role) {
    return res.status(200).json({
      message: `ITMC{9.You changed your role to ${user.role}. Are you trying to become a hacker???}`,
    });
  }
});


app.post("/pets/new", async (req, res) => {
  const { ownerId, name, type } = req.body || {};
  if (!ownerId || !name || !type) return res.status(400).json({ message: "ownerId, name, type required" });
  const owner = await User.findById(ownerId);
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  const pet = await Pet.create({ owner: owner._id, name, type });
  return res.status(201).json({
    message: `ITMC{6. ${pet.name}} To view your pet, go to an endpoint users/YOUR PRIMARY KEY/pets. Also SAVE your pet_id.`,
    petId: pet._id.toString(),
  });
});

app.get("/users/:id/pets", async (req, res) => {
  const { id } = req.params;
  const owner = await User.findById(id);
  if (!owner) return res.status(404).json({ message: "User not found" });
  const pets = await Pet.find({ owner: id });
  return res.status(200).json({
    message: "ITMC{7. Wow Ang Galing!}. Now, can you try fetching all pets in /pets endpoint?",
    pets,
  });
});

app.get("/pets", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(401).json({ message: "userId query required. But how??? Did your instructor even tell you this? I bet he didn’t, because he forgot. Just add this ?userId=YOUR_USER_ID_VALUE in url."});
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role !== "admin") {
    return res.status(403).json({
      message:
        "ITMC{8. Uh oh}. Of course you cant! You are not authorized. Maybe retrieve your data first to see what is your role? Then may be, may be if you change that role you can view all pets.",
    });
  }
  const pets = await Pet.find().populate("owner", "username");
  return res.status(200).json({
    message: "ITMC{10. All_pets_listed_successfully}. You changed the role???? What are you??? Okay you're good! Now retrieve how many pets are there in stats/pets/count endpoint",
    pets,
  });
});

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.status(200).json({
    user,
    message: "What do you think is the role that can view all pets? vet? admin? faculty? or backend?"
  });
});


app.get("/stats/pets/count", async (req, res) => {
  const count = await Pet.countDocuments();
  const now = new Date();
  const date = now.toLocaleDateString("en-PH");
  const time = now.toLocaleTimeString("en-PH");

  return res.status(200).json({
    message: `ITMC{11. pet_count:${count}_date:${date}_time:${time}}. Good job, can you delete your pet to proceed with number 12? The endpoint? Take a guess — there are plenty of clues.`,
  });
});

app.delete("/pets/:id", async (req, res) => {
  const { id } = req.params;
  return res.status(403).json({
    message: `Cannot delete pets due to API restrictions. ITMC{12. NiceTry! ${id}}. I am intrigued… who do you think is the oldest and the youngest here? Want to know? Then check it in /stats/users/ages.`,
  });
});

app.get("/stats/users/ages", async (req, res) => {
  const maxAge = await User.findOne().sort({ age: -1 }).select("age");
  const minAge = await User.findOne().sort({ age: 1 }).select("age");

  const oldestUsers = await User.find({ age: maxAge.age }).select("username age");
  const youngestUsers = await User.find({ age: minAge.age }).select("username age");

  return res.status(200).json({
    message: `ITMC{13. oldest:[${oldestUsers.map(u => u.username).join(",")}]_${maxAge.age}_youngest:[${youngestUsers.map(u => u.username).join(",")}]_${minAge.age}} Nice work! Now, can you check how many users exist in /stats/users/count?`
  });
});


app.get("/stats/users/count", async (req, res) => {
  const now = new Date();
  const date = now.toLocaleDateString("en-PH");
  const time = now.toLocaleTimeString("en-PH");
  const count = await User.countDocuments();
  return res.status(200).json({
    message: `ITMC{14. users:${count}_date:${date}_time:${time}} Almost done! One last step… log out at /logout.`
  });
});

app.post("/logout", (req, res) => {
  const code = generateCode();
  return res.status(200).json({
    message: `ITMC{15. ${code}_logged_out_successfully} Congratulations, you completed the exam!`
  });
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ITMC Quiz API running on http://localhost:${PORT}`);
});
