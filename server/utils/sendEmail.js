import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

export const sendEmail = async ({ to, subject, template: EmailTemplate, context = {}, html, text }) => {
    try {
        let emailContent = html; // Prioritize explicit HTML content

        if (!emailContent && EmailTemplate) {
            // If no direct HTML, but a React component template is provided
            emailContent = ReactDOMServer.renderToString(
                React.createElement(EmailTemplate, context)
            );
        } else if (!emailContent && text) {
            // If no HTML or template, use plain text with a minimal HTML wrapper
            emailContent = `<pre>${text}</pre>`;
        } else if (!emailContent) {
            // If neither HTML, template, nor text was passed, this is an error
            console.error("No HTML, template, or text provided to sendEmail");
            throw new Error("Email content (HTML, template, or text) is missing.");
        }

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: emailContent,
        });

        console.log("✅ Email sent to:", to);
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw error;
    }
};