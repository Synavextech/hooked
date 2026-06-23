"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Submit a review (authenticated users)
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, message } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        // Check if the user already submitted a review
        const { data: existingReview, error: checkError } = await db_1.supabase
            .from('reviews')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
        if (checkError)
            throw checkError;
        let reviewData;
        if (existingReview) {
            // Update existing review and reset status to pending for re-moderation
            const { data, error } = await db_1.supabase
                .from('reviews')
                .update({
                rating,
                message: message.trim(),
                status: 'pending',
                updated_at: new Date()
            })
                .eq('id', existingReview.id)
                .select()
                .single();
            if (error)
                throw error;
            reviewData = data;
        }
        else {
            // Insert new review
            const { data, error } = await db_1.supabase
                .from('reviews')
                .insert({
                user_id: userId,
                rating,
                message: message.trim(),
                status: 'pending'
            })
                .select()
                .single();
            if (error)
                throw error;
            reviewData = data;
        }
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully! It is now pending administrator review.',
            review: reviewData
        });
    }
    catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all active (approved) reviews for Landing page (public access)
router.get('/active', async (req, res) => {
    try {
        const { data: reviews, error } = await db_1.supabase
            .from('reviews')
            .select(`
        id, rating, message, created_at,
        user:users!user_id(names)
      `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        // Format response
        const formattedReviews = reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            message: r.message,
            created_at: r.created_at,
            reviewer_name: r.user?.names || 'Anonymous'
        }));
        res.json(formattedReviews);
    }
    catch (error) {
        console.error('Fetch active reviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
