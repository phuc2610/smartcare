const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getNotifications);
router.post('/:id/read', authenticate, markAsRead);

module.exports = router;
