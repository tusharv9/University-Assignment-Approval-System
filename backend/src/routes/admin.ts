import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/departments/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { name, type, address } = req.body as {
      name?: string;
      type?: 'UG' | 'PG' | 'RESEARCH';
      address?: string;
    };

    if (!name || !type || !address) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, type (UG/PG/RESEARCH), address'
      });
    }

    const normalizedType = String(type).toUpperCase();
    if (!['UG', 'PG', 'RESEARCH'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid program type. Allowed: UG, PG, RESEARCH'
      });
    }

    const existing = await prisma.department.findUnique({
      where: { name }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    const department = await prisma.department.create({
      data: {
        name,
        type: normalizedType as 'UG' | 'PG' | 'RESEARCH',
        address
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department }
    });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating department'
    });
  }
});

router.get('/departments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const pageParam = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
    const pageSizeParam = Array.isArray(req.query.pageSize) ? req.query.pageSize[0] : req.query.pageSize;
    const searchParam = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
    const typeParam = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;

    const page = Math.max(parseInt(String(pageParam || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(pageSizeParam || '10'), 10) || 10, 1), 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (searchParam) {
      where.name = { contains: String(searchParam), mode: 'insensitive' };
    }
    if (typeParam) {
      const normalizedType = String(typeParam).toUpperCase();
      if (!['UG', 'PG', 'RESEARCH'].includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type filter. Allowed: UG, PG, RESEARCH'
        });
      }
      where.type = normalizedType;
    }

    const [total, items] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { users: true }
          }
        }
      })
    ]);

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return res.json({
      success: true,
      data: {
        items: items.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          address: d.address,
          userCount: (d as any)._count?.users ?? 0,
          actions: {
            edit: `/admin/departments/${d.id}/edit`,
            delete: `/admin/departments/${d.id}`
          }
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        filters: {
          type: typeParam || null,
          search: searchParam || null
        }
      }
    });
  } catch (error) {
    console.error('List departments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while listing departments'
    });
  }
});

router.get('/departments/:id/edit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    return res.json({
      success: true,
      data: { department }
    });
  } catch (error) {
    console.error('Get department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching department'
    });
  }
});

router.put('/departments/:id/update', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const { name, type, address } = req.body as {
      name?: string;
      type?: 'UG' | 'PG' | 'RESEARCH';
      address?: string;
    };

    if (!name || !type || !address) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, type (UG/PG/RESEARCH), address'
      });
    }

    const normalizedType = String(type).toUpperCase();
    if (!['UG', 'PG', 'RESEARCH'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid program type. Allowed: UG, PG, RESEARCH'
      });
    }

    const existing = await prisma.department.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    if (name !== existing.name) {
      const conflict = await prisma.department.findUnique({
        where: { name }
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another department with this name already exists'
        });
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name,
        type: normalizedType as 'UG' | 'PG' | 'RESEARCH',
        address
      }
    });

    return res.json({
      success: true,
      message: 'Department updated successfully',
      data: { department: updated }
    });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating department'
    });
  }
});

router.delete('/departments/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const userCount = await prisma.user.count({
      where: { departmentId: id }
    });

    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete department with associated users. Please reassign or remove users first.'
      });
    }

    await prisma.department.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting department'
    });
  }
});

router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const [totalAdmins, totalDepartments] = await Promise.all([
      prisma.admin.count(),
      prisma.department.count()
    ]);

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        admin,
        statistics: {
          totalAdmins,
          totalDepartments
        },
        nav: [
          { label: 'Departments', href: '/admin/departments' },
          { label: 'Users', href: '/admin/users' }
        ]
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: {
        admin
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/users/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name, email, phone, departmentId, role, password } = req.body;

    if (!name || !email || !phone || !departmentId || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (!['STUDENT', 'PROFESSOR', 'HOD'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email Already Exists!'
      });
    }

    const dept = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Department'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
        password: hashedPassword,
        departmentId: Number(departmentId)
      }
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    console.log('Create user err', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const pageParam = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
    const pageSizeParam = Array.isArray(req.query.pageSize) ? req.query.pageSize[0] : req.query.pageSize;
    const searchParam = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
    const roleParam = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
    const departmentParam = Array.isArray(req.query.departmentId)
      ? req.query.departmentId[0]
      : req.query.departmentId;

    const page = Math.max(parseInt(String(pageParam || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(pageSizeParam || '20'), 10) || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (searchParam) {
      const searchValue = String(searchParam);
      where.OR = [
        { name: { contains: searchValue, mode: 'insensitive' } },
        { email: { contains: searchValue, mode: 'insensitive' } }
      ];
    }

    if (roleParam) {
      const normalizedRole = String(roleParam).toUpperCase();
      if (!['STUDENT', 'PROFESSOR', 'HOD'].includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role filter. Allowed: STUDENT, PROFESSOR, HOD'
        });
      }
      where.role = normalizedRole;
    }

    if (departmentParam) {
      const departmentId = Number(departmentParam);
      if (Number.isNaN(departmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department filter'
        });
      }
      where.departmentId = departmentId;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return res.json({
      success: true,
      data: {
        items: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          department: user.department
            ? {
                id: user.department.id,
                name: user.department.name
              }
            : null,
          status: 'Active',
          createdAt: user.createdAt,
          actions: {
            edit: `/admin/users/${user.id}/edit`,
            delete: `/admin/users/${user.id}`
          }
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        filters: {
          role: roleParam || null,
          departmentId: departmentParam || null,
          search: searchParam || null
        }
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while listing users'
    });
  }
});

router.get('/users/:id/edit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          departmentId: user.departmentId,
          department: user.department,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user'
    });
  }
});

router.put('/users/:id/update', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const { name, email, phone, departmentId, password } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      departmentId?: number | string;
      password?: string;
    };

    if (!name || !email || !phone || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const emailConflict = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id }
      }
    });
    if (emailConflict) {
      return res.status(409).json({
        success: false,
        message: 'Another user with this email already exists'
      });
    }

    const dept = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Department'
      });
    }

    const updateData: any = {
      name,
      email,
      phone,
      departmentId: Number(departmentId)
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        department: {
          select: { id: true, name: true }
        }
      }
    });

    return res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          department: updatedUser.department,
          departmentId: updatedUser.departmentId
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating user'
    });
  }
});

router.delete('/users/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'STUDENT') {
      const pendingAssignments = await prisma.assignment.count({
        where: {
          studentId: id,
          status: 'PENDING'
        }
      });

      if (pendingAssignments > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete student with pending assignments'
        });
      }
    }

    await prisma.user.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting user'
    });
  }
});

export default router;