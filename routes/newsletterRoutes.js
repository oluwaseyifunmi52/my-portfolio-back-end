import express from "express";

import {
    subscribeToNewsletter,
    getNewsletterSubscribers,
    deleteNewsletterSubscriber,
} from "../controllers/newsletterController.js";

const router = express.Router();

router.post("/", subscribeToNewsletter);

router.get("/", getNewsletterSubscribers);

router.delete("/:id", deleteNewsletterSubscriber);

export default router;