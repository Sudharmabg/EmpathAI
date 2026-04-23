# EmpathAI Admin Panel

## Overview
The EmpathAI Admin Panel is a comprehensive management interface built with the same design language as the main EmpathAI homepage. It provides administrators with tools to manage users across different roles and create/manage assessments.

## Features

### 1. User Management
Manage four distinct user roles with role-specific fields:

#### **Students**
- Name, Email, Password
- Grade Level
- School Assignment
- Auto-generated passwords on creation

#### **School Administrators**
- Name, Email, Password
- School Name
- Administrative access to school-level data

#### **Psychologists**
- Name, Email, Password
- License ID
- Professional credentials tracking

#### **Content Administrators**
- Name, Email, Password
- Department (Curriculum, Assessment, Technical)
- Content management permissions

**Features:**
- ✅ Create new users with auto-generated passwords
- ✅ Edit existing user information
- ✅ Delete users with confirmation
- ✅ Filter users by role (tabbed interface)
- ✅ Role-specific form fields
- ✅ Password generation utility

### 2. Assessment Management
Create and manage assessments with flexible question types:

**Assessment Properties:**
- Title
- Grade Level (1st-12th)
- Subject Area
- Question Collection

**Question Types:**
- **Text Answer:** Open-ended text responses
- **Multiple Choice:** Comma-separated options
- **Rating Scale:** 1-5 scale for emotional/behavioral ratings

**Features:**
- ✅ Create new assessments
- ✅ Edit existing assessments
- ✅ Delete assessments with confirmation
- ✅ Add/remove questions dynamically
- ✅ Visual question builder
- ✅ Card-based assessment overview

## Design Language

The admin panel maintains consistency with the EmpathAI homepage:

### Colors
- **Primary Purple:** `#6366F1` (Buttons, active states)
- **Dark Navy:** `#2D1B69` (Text, headers)
- **Purple Gradients:** `from-purple-600 to-purple-700`
- **Gray Scale:** For backgrounds and borders

### UI Components
- **Sidebar Navigation:** Fixed sidebar with icon-based menu
- **Modal Dialogs:** Centered overlays for create/edit forms
- **Tables:** Clean, responsive data tables
- **Cards:** Rounded, shadowed cards for assessments
- **Buttons:** Rounded with hover effects and icons

### Icons
Using Heroicons (`@heroicons/react/24/outline`):
- `UsersIcon` - User Management
- `ClipboardDocumentCheckIcon` - Assessment Management
- `ChartBarIcon` - Analytics (placeholder)
- `PlusIcon`, `PencilIcon`, `TrashIcon` - CRUD actions

## Access & Authentication

### Login Credentials

**Admin Access:**
- Email: `admin@empathai.com`
- Password: `admin1234`

**Student Access (for testing):**
- Email: `test1@test.com`
- Password: `test1234`

### How to Access
1. Navigate to the homepage
2. Click "Begin Your Journey" or "Sign In"
3. Use admin credentials
4. You'll be automatically routed to the Admin Panel

## File Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── AdminPanel.jsx          # Main admin layout with sidebar
│   │   ├── UserManagement.jsx      # User CRUD interface
│   │   └── AssessmentManagement.jsx # Assessment CRUD interface
│   ├── LoginModal.jsx              # Updated with admin login
│   └── ...
├── App.jsx                         # Updated with admin routing
└── ...
```

## Technical Implementation

### State Management
- Local component state using React `useState`
- Mock data for demonstration (ready for API integration)
- LocalStorage for session persistence

### Responsive Design
- Mobile-first approach
- Collapsible sidebar on mobile
- Responsive tables and forms
- Touch-friendly buttons and controls

### Form Handling
- Controlled components
- Client-side validation
- Auto-generated passwords
- Dynamic form fields based on role

## Future Enhancements

### Planned Features
- [ ] API integration for real data persistence
- [ ] Advanced filtering and search
- [ ] Bulk user operations
- [ ] Assessment preview mode
- [ ] Analytics dashboard
- [ ] Export functionality (CSV, PDF)
- [ ] Role-based permissions
- [ ] Audit logs
- [ ] Email notifications
- [ ] Advanced question types (drag-drop, image-based)

### Backend Integration Points
```javascript
// User Management
POST   /api/users          // Create user
GET    /api/users          // List users
GET    /api/users/:id      // Get user
PUT    /api/users/:id      // Update user
DELETE /api/users/:id      // Delete user

// Assessment Management
POST   /api/assessments    // Create assessment
GET    /api/assessments    // List assessments
GET    /api/assessments/:id // Get assessment
PUT    /api/assessments/:id // Update assessment
DELETE /api/assessments/:id // Delete assessment
```

## Running the Application

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Or if you encounter PowerShell issues:
   ```bash
   node node_modules/vite/bin/vite.js
   ```

3. **Access the Application:**
   - Homepage: `http://localhost:3001`
   - Login with admin credentials
   - Admin panel loads automatically

## Design Consistency Checklist

✅ Uses EmpathAI color palette (Purple, Navy, Gray)
✅ Lora font family for typography
✅ Heroicons for consistent iconography
✅ Rounded corners and shadows
✅ Gradient backgrounds on cards
✅ Smooth transitions and hover effects
✅ Responsive mobile design
✅ Accessible form labels and ARIA attributes

## Notes

- **UI Only:** This is a frontend-only implementation. All data is stored in component state and will reset on page refresh (except login session).
- **Password Generation:** Uses a simple random string generator. In production, use a secure password generation library.
- **Validation:** Basic client-side validation is implemented. Server-side validation will be required for production.
- **Security:** Login is demonstration-only. Implement proper authentication (JWT, OAuth) for production.

## Support

For questions or issues, please refer to the main EmpathAI documentation or contact the development team.
