/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { UserManagementPanel } from '@/features/user/screens/UserManagementPanel.tsx';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';
import {
    CREATE_USER,
    DEACTIVATE_USER,
    DELETE_USER,
    FORCE_SIGN_OUT_USER,
    REACTIVATE_USER,
    UPDATE_USER,
} from '@/lib/graphql/user/UserMutation.ts';

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockToast = vi.fn();

vi.mock('@apollo/client', async () => {
    const actual = await vi.importActual('@apollo/client');
    return {
        ...actual,
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
        useMutation: (...args: unknown[]) => mockUseMutation(...args),
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('@/features/navigation-bar/hooks/useAppTitle.ts', () => ({
    useAppTitle: () => {},
}));

vi.mock('@/base/utils/Toast.ts', () => ({
    makeToast: (...args: unknown[]) => mockToast(...args),
}));

const resetAuthState = () => {
    AuthManager.removeTokens();
    AuthManager.clearUserIdentity();
    AuthManager.setAuthInitialized(true);
    AuthManager.setAuthRequired(true);
};

type UserAccountItem = {
    id: number;
    username: string;
    role: UserRole;
    isActive: boolean;
    createdAt: number;
};

type MutationMocks = {
    createUser: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    deactivateUser: ReturnType<typeof vi.fn>;
    reactivateUser: ReturnType<typeof vi.fn>;
    forceSignOutUser: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
    refetchUsers: ReturnType<typeof vi.fn>;
};

const setupApolloMocks = (users: UserAccountItem[]): MutationMocks => {
    const createUser = vi.fn().mockResolvedValue({});
    const updateUser = vi.fn().mockResolvedValue({});
    const deactivateUser = vi.fn().mockResolvedValue({});
    const reactivateUser = vi.fn().mockResolvedValue({});
    const forceSignOutUser = vi.fn().mockResolvedValue({});
    const deleteUser = vi.fn().mockResolvedValue({});
    const refetchUsers = vi.fn().mockResolvedValue({ data: { users } });

    mockUseQuery.mockReturnValue({
        data: { users },
        loading: false,
        error: undefined,
        refetch: refetchUsers,
    });

    mockUseMutation.mockImplementation((document: unknown) => {
        if (document === CREATE_USER) return [createUser, { loading: false }];
        if (document === UPDATE_USER) return [updateUser, { loading: false }];
        if (document === DEACTIVATE_USER) return [deactivateUser, { loading: false }];
        if (document === REACTIVATE_USER) return [reactivateUser, { loading: false }];
        if (document === FORCE_SIGN_OUT_USER) return [forceSignOutUser, { loading: false }];
        if (document === DELETE_USER) return [deleteUser, { loading: false }];

        return [vi.fn().mockResolvedValue({}), { loading: false }];
    });

    return { createUser, updateUser, deactivateUser, reactivateUser, forceSignOutUser, deleteUser, refetchUsers };
};

describe('UserManagementPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetAuthState();
        AuthManager.setUserIdentity(1, 'admin_root', UserRole.Admin);
    });

    it('renders users returned by query', () => {
        setupApolloMocks([
            { id: 1, username: 'admin_root', role: UserRole.Admin, isActive: true, createdAt: 1710000000000 },
            { id: 2, username: 'reader_one', role: UserRole.User, isActive: true, createdAt: 1710000000000 },
        ]);

        render(<UserManagementPanel />);

        expect(screen.getByText('admin_root')).toBeInTheDocument();
        expect(screen.getByText('reader_one')).toBeInTheDocument();
    });

    it('validates create user password policy in modal', async () => {
        setupApolloMocks([{ id: 1, username: 'admin_root', role: UserRole.Admin, isActive: true, createdAt: 1 }]);
        render(<UserManagementPanel />);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'settings.user_management.action.create_user' }));
        await user.type(screen.getByLabelText('settings.user_management.label.username'), 'new_user');
        await user.type(screen.getByLabelText('settings.user_management.label.password'), 'short');
        await user.click(screen.getByRole('button', { name: 'global.button.create' }));

        expect(screen.getByText('settings.user_management.error.password_too_short')).toBeInTheDocument();
    });

    it('opens delete confirmation and submits delete mutation', async () => {
        const mutationMocks = setupApolloMocks([
            { id: 1, username: 'admin_root', role: UserRole.Admin, isActive: true, createdAt: 1 },
            { id: 2, username: 'reader_one', role: UserRole.User, isActive: true, createdAt: 2 },
        ]);
        render(<UserManagementPanel />);

        const user = userEvent.setup();
        const readerRow = screen.getByRole('row', { name: /reader_one/i });
        await user.click(within(readerRow).getByTestId('user-delete-2'));

        expect(screen.getByText('settings.user_management.dialog.delete.title')).toBeInTheDocument();

        await user.click(screen.getByTestId('user-management-delete-confirm'));

        await waitFor(() => {
            expect(mutationMocks.deleteUser).toHaveBeenCalledWith({ variables: { input: { id: 2 } } });
        });
    });

    it('disables delete button when current user is the last active admin', () => {
        setupApolloMocks([{ id: 1, username: 'admin_root', role: UserRole.Admin, isActive: true, createdAt: 1 }]);
        render(<UserManagementPanel />);

        const adminRow = screen.getByRole('row', { name: /admin_root/i });
        const deleteButton = within(adminRow).getByLabelText('global.button.delete');
        expect(deleteButton).toBeDisabled();
    });
});
