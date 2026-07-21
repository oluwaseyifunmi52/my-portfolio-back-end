import Contact from "../models/Contact.js";
import transporter from "../config/mailer.js";

export const submitContactForm = async (req, res, next) => {
    try {
        const {
            name,
            email,
            subject,
            message,
        } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required.",
            });
        }

        // Save message to MongoDB
        const contact = await Contact.create({
            name,
            email,
            subject,
            message,
        });

        // Send email notification
        await transporter.sendMail({
            from: `"Portfolio Contact Form" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: subject || `New message from ${name}`,

            html: `
                <h2>New Portfolio Contact Message</h2>

                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject || "No subject"}</p>

                <h3>Message:</h3>
                <p>${message}</p>
            `,
        });

        res.status(201).json({
            success: true,
            message: "Your message has been sent successfully.",
            data: contact,
        });

    } catch (error) {
        next(error);
    }
};