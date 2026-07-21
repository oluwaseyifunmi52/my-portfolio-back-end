import Newsletter from "../models/Newsletter.js";


// Subscribe to newsletter
export const subscribeToNewsletter = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const existingSubscriber = await Newsletter.findOne({ email });

        if (existingSubscriber) {
            return res.status(409).json({
                success: false,
                message: "This email is already subscribed",
            });
        }

        const subscriber = await Newsletter.create({
            email,
        });

        res.status(201).json({
            success: true,
            message: "Successfully subscribed to the newsletter",
            data: subscriber,
        });
    } catch (error) {
        next(error);
    }
};


// Get all subscribers
export const getNewsletterSubscribers = async (
    req,
    res,
    next
) => {
    try {
        const subscribers = await Newsletter.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: subscribers.length,
            data: subscribers,
        });
    } catch (error) {
        next(error);
    }
};


// Delete subscriber
export const deleteNewsletterSubscriber = async (
    req,
    res,
    next
) => {
    try {
        const subscriber =
            await Newsletter.findByIdAndDelete(req.params.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: "Subscriber not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Subscriber deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};