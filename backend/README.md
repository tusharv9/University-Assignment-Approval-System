# University Assignment Approval Platform - Backend API

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (configured in `.env`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with:
```env
DATABASE_URL="your_database_connection_string"
PORT=3000
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
ADMIN_EMAIL="admin@university.edu"  # Optional: for admin creation script
ADMIN_PASSWORD="admin123"           # Optional: for admin creation script
```

3. Generate Prisma Client:
```bash
npm run prisma:generate
```

4. Push database schema:
```bash
npm run prisma:push
```

5. Create admin user:
```bash
# Make sure the server is running first (npm run dev)
npm run create-admin
```

Or register via API:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"admin123"}'
```

### Running the Server

#### Development Mode (with auto-reload)
```bash
npm run dev
```
Server will run on http://localhost:3000

#### Production Mode
```bash
# Build TypeScript
npm run build

# Start server
npm start
```

## API Endpoints

### Authentication

#### POST /auth/register
Register a new admin user.

**Request:**
```json
{
  "email": "admin@university.edu",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@university.edu",
      "createdAt": "2025-11-10T05:59:19.729Z"
    }
  }
}
```

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@university.edu",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": 1,
      "email": "admin@university.edu",
      "createdAt": "2025-11-10T05:59:19.729Z"
    }
  }
}
```

**Error Response (Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Admin Routes (Require Authentication)

All admin routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

#### GET /admin/dashboard
Get admin dashboard data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@university.edu",
      "createdAt": "2025-11-10T05:59:19.729Z"
    },
    "statistics": {
      "totalAdmins": 1
    }
  }
}
```

#### GET /admin/profile
Get admin profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@university.edu",
      "createdAt": "2025-11-10T05:59:19.729Z"
    }
  }
}
```

### General Endpoints

#### GET /
Welcome message with API information.

#### GET /health
Health check endpoint.

#### GET /api/test-db
Test database connection.

## Authentication Flow

1. **Register Admin** (one-time setup):
   ```bash
   POST /auth/register
   {
     "email": "admin@university.edu",
     "password": "admin123"
   }
   ```

2. **Login**:
   ```bash
   POST /auth/login
   {
     "email": "admin@university.edu",
     "password": "admin123"
   }
   ```
   Response includes a JWT token.

3. **Access Protected Routes**:
   Include the token in the Authorization header:
   ```bash
   GET /admin/dashboard
   Authorization: Bearer <token>
   ```

## Example Usage

### Using cURL

1. Register:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"admin123"}'
```

2. Login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"admin123"}'
```

3. Access Dashboard:
```bash
TOKEN="your-jwt-token-here"
curl -X GET http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@university.edu',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Access Dashboard
const dashboardResponse = await fetch('http://localhost:3000/admin/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const dashboardData = await dashboardResponse.json();
console.log(dashboardData);
```

## Security Features

- ✅ Password hashing using bcrypt (10 salt rounds)
- ✅ JWT token-based authentication
- ✅ Token expiration (24 hours)
- ✅ Protected routes with authentication middleware
- ✅ Input validation and error handling
- ✅ Secure error messages (no sensitive information exposed)

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run create-admin` - Create admin user (server must be running)
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:migrate` - Create and run migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:validate` - Validate Prisma schema

## Project Structure

```
backend/
├── src/
│   ├── server.ts          # Main server file
│   ├── prisma.ts          # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts        # JWT authentication middleware
│   └── routes/
│       ├── auth.ts        # Authentication routes
│       └── admin.ts       # Admin routes
├── scripts/
│   └── create-admin-simple.js  # Admin creation script
├── prisma/
│   └── schema.prisma      # Database schema
└── .env                   # Environment variables
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials, missing token)
- `403` - Forbidden (invalid/expired token)
- `404` - Not Found
- `409` - Conflict (email already exists)
- `500` - Internal Server Error

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running, or:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 24 hours
- Default admin credentials can be changed via environment variables
- All authentication errors return the same message ("Invalid email or password") for security
- CORS is enabled for all origins in development (change in production)
