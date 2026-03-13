const path = require("path");
const express = require("express");
const app = express();
const cors = require('cors');
const getRoutes = require("./routes/getRoutes");
const postRoute = require("./routes/postRoutes");
const stripeRoutes = require('./routes/stripeRoutes')
const proxyRoutes = require('./routes/proxyRoutes');
const supabase = require("./utils/supabaseClient");
const webhooksRoutes = require('./routes/webhooks');
const squareUpRoutes = require('./routes/squareUpRoutes');
const authorizeRoutes = require('./routes/authorizeRoutes');
const { createServer } = require('http');
const { Server } = require('socket.io');

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.urlencoded({ extended: true })); 
app.use(express.json(), (err, req, res, next) => {
  if (err) {
      console.error('Invalid JSON:', err.message);
      return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

// Keep all existing routes intact
app.use(getRoutes)
app.use(postRoute)
app.use(stripeRoutes)
app.use(proxyRoutes)
app.use(webhooksRoutes);
app.use(squareUpRoutes);
app.use('/authorize',authorizeRoutes);

// --- WebSocket server setup ---
// Use http.createServer to allow both HTTP and WebSocket (Socket.IO) connections
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});


// Helper to upsert user into online_users
async function addOnlineUser(userId, socketId) {
  try {
    await supabase
      .from('online_users')
      .upsert([{ 
        user_id: userId, 
        socket_id: socketId, 
        connected_at: new Date().toISOString() 
      }], { onConflict: ['user_id'] });
    console.log(`User ${userId} added to online users with socket ${socketId}`);
  } catch (err) {
    console.error('Error adding online user:', err.message);
  }
}

// Helper to remove user from online_users
async function removeOnlineUser(socketId) {
  try {
    const { data } = await supabase
      .from('online_users')
      .select('user_id')
      .eq('socket_id', socketId)
      .single();
    
    await supabase
      .from('online_users')
      .delete()
      .eq('socket_id', socketId);
    
    if (data) {
      console.log(`User ${data.user_id} removed from online users`);
    }
  } catch (err) {
    console.error('Error removing online user:', err.message);
  }
}

// Helper to get all online users
async function getOnlineUsers() {
  try {
    const { data, error } = await supabase
      .from('online_users')
      .select('user_id, connected_at');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching online users:', err.message);
    return [];
  }
}

// WebSocket connection management for online user presence
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  // Handle user joining (authenticate and add to online users)
  socket.on('join', async (userId) => {
    if (!userId) {
      console.log('Join attempt without userId');
      return;
    }
    
    // Store userId in socket for later reference
    socket.userId = userId;
    
    // Add user to online users table
    await addOnlineUser(userId, socket.id);
    
    // Broadcast updated online users list to all clients
    const onlineUsers = await getOnlineUsers();
    io.emit('online_users_updated', onlineUsers);
    
    // Join user to a room if needed (for targeted messaging)
    socket.join(`user_${userId}`);
    
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });
  
  // Handle user disconnection
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Remove user from online users table
    await removeOnlineUser(socket.id);
    
    // Broadcast updated online users list to all clients
    const onlineUsers = await getOnlineUsers();
    io.emit('online_users_updated', onlineUsers);
    
    if (socket.userId) {
      console.log(`User ${socket.userId} disconnected`);
    }
  });
  
  // Handle manual leave (if user wants to go offline without disconnecting)
  socket.on('leave', async () => {
    if (socket.userId) {
      await removeOnlineUser(socket.id);
      
      // Broadcast updated online users list
      const onlineUsers = await getOnlineUsers();
      io.emit('online_users_updated', onlineUsers);
      
      console.log(`User ${socket.userId} manually left`);
      socket.userId = null;
    }
  });
  
  // Handle request for current online users
  socket.on('get_online_users', async () => {
    const onlineUsers = await getOnlineUsers();
    socket.emit('online_users_list', onlineUsers);
  });
});

// Helper function for getting client IP (for logging)
const getClientIp = (req) => {
  // Check for specific headers added by proxies
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Get the first IP in the list (client's original IP)
    return forwardedFor.split(',')[0].trim();
  }
  
  // Check for other common proxy headers
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // Fallback to the connection's remote address
  return req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket?.remoteAddress;
};

// Catch-all route for logging unknown requests
app.use('*', async (req, res) => {
    const userDetails = {
        method: req.method,
        path: req.originalUrl,
        headers: req.headers,
        ip: getClientIp(req),
        body: req.body,
        timestamp: new Date().toISOString()
    };

    try {
        await supabase.from('user_requests').insert([userDetails]);
    } catch (error) {
        console.error('Error saving to Supabase:', error.message);
    }

    res.send(`
        <html>
        <head><title>Unknown Route</title></head>
        <body>
            <h1>404 - This Page Does Not Exist</h1>
            <p>Your request cannot be resolved.</p>
        </body>
        </html>
    `);
});

// Start server (HTTP + WebSocket) on port 8080
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running with WebSocket support on port ${PORT}`);
});