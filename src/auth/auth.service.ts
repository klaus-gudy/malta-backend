import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Permission } from '../common/role-meta';
import { PERMISSIONS, roleMeta } from '../common/role-meta';
import { ROLE_IDS } from '../common/enums';
import { UsersService } from '../users/users.service';

export interface AuthResult {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: string;
  label: string;
  permissions: Permission[];
  token: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  // Role catalogue for the login screen / role pickers.
  roles() {
    return ROLE_IDS.map((id) => ({ id, ...roleMeta[id] }));
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.users.findForAuth(username);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password');
    }
    if (user.status !== 'Active') {
      throw new UnauthorizedException('This account is inactive');
    }

    await this.users.touchLastLogin(user.id);

    const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
      PERMISSIONS[p].includes(user.role),
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      status: user.status,
      label: roleMeta[user.role].label,
      permissions,
      token: `malta-demo-${user.id}`,
    };
  }
}
