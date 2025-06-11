import dotenv from "dotenv";
dotenv.config();

import { sendEmail } from "./utils/sendEmail.js";

async function test() {
  try {
    await sendEmail("negiprashant857@gmail.com", "Test Email", "Yeh test email hai!");
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

test();
