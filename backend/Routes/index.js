const express = require("express");
const router = express.Router();
const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application = require("./application");
const user = require("./user");
const loginTracking = require("./loginTracking");
const subscription = require("./subscription");
const resume = require("./resume");
const publicspace = require("./publicspace");

router.use("/admin", admin);
router.use("/internship", intern);
router.use("/job", job);
router.use("/application", application);
router.use("/user", user);
router.use("/login-tracking", loginTracking);
router.use("/subscription", subscription);
router.use("/resume", resume);
router.use("/publicspace", publicspace);

module.exports = router;
