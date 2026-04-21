/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { AccountSettings } from '@/features/user/screens/AccountSettings.tsx';

const mockNavigate = vi.fn();
const mockChangePassword = vi.fn();
const mockLogout = vi.fn();
const mockToast = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/features/navigation-bar/hooks/useAppTitle.ts', () => ({
    useAppTitle: () => {},
}));

vi.mock('@/base/utils/Toast.ts', () => ({
    makeToast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock('@/lib/requests/RequestManager.ts', () => ({
    requestManager: {
        useChangePassword: () => [mockChangePassword, { loading: false }],
        useLogoutUser: () => [mockLogout, { loading: false }],
    },
}));

const resetAuthState = () => {
    AuthManager.removeTokens();
    AuthManager.clearUserIdentity();
    AuthManager.setIsRefreshingToken(false);
    AuthManager.setAuthInitialized(true);
    AuthManager.setAuthRequired(true);
};

describe('AccountSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetAuthState();
        AuthManager.setTokens('access-token', 'refresh-token');
        AuthManager.setUserIdentity(42, 'reader_a', UserRole.User);
    });

    it('submits password change and logs out afterwards', async () => {
        mockChangePassword.mockResolvedValue({ data: { changePassword: { success: true } } });

        render(<AccountSettings />);

        const user = userEvent.setup();
        await user.type(screen.getByTestId('account-current-password'), 'OldPassword123');
        await user.type(screen.getByTestId('account-new-password'), 'NewPassword123');
        await user.type(screen.getByTestId('account-confirm-password'), 'NewPassword123');
        await user.click(screen.getByTestId('account-change-password'));

        await waitFor(() => {
            expect(mockChangePassword).toHaveBeenCalledWith({
                variables: { currentPassword: 'OldPassword123', newPassword: 'NewPassword123' },
            });
        });

        expect(AuthManager.getTokens()).toEqual({ accessToken: null, refreshToken: null });
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
    });

    it('signs out all devices via logout mutation', async () => {
        mockLogout.mockResolvedValue({ data: { logout: { success: true } } });

        render(<AccountSettings />);

        const user = userEvent.setup();
        await user.click(screen.getByTestId('account-signout-all'));

        await waitFor(() => {
            expect(mockLogout).toHaveBeenCalledTimes(1);
        });

        expect(AuthManager.getTokens()).toEqual({ accessToken: null, refreshToken: null });
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
    });
});
