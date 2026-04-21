/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { UserIdentityLoader } from '@/features/authentication/components/UserIdentityLoader.tsx';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockUseGetMe = vi.fn();

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

vi.mock('@/base/utils/Toast.ts', () => ({
    makeToast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock('@/lib/requests/RequestManager.ts', () => ({
    requestManager: {
        useGetMe: () => mockUseGetMe(),
    },
}));

const resetAuthState = () => {
    AuthManager.removeTokens();
    AuthManager.clearUserIdentity();
    AuthManager.setAuthInitialized(true);
    AuthManager.setAuthRequired(true);
};

describe('UserIdentityLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetAuthState();
        AuthManager.setAccessToken('access-token');
    });

    it('stores identity for active users', async () => {
        mockUseGetMe.mockReturnValue({
            data: { me: { id: 3, username: 'active_user', role: UserRole.User, isActive: true } },
        });

        render(<UserIdentityLoader />);

        await waitFor(() => {
            expect(AuthManager.getUserId()).toBe(3);
            expect(AuthManager.getUsername()).toBe('active_user');
            expect(AuthManager.getRole()).toBe(UserRole.User);
        });

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockToast).not.toHaveBeenCalled();
    });

    it('forces logout for deactivated users', async () => {
        AuthManager.setTokens('access-token', 'refresh-token');
        mockUseGetMe.mockReturnValue({
            data: { me: { id: 4, username: 'inactive_user', role: UserRole.User, isActive: false } },
        });

        render(<UserIdentityLoader />);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith('settings.account.label.inactive_warning', 'error');
        });

        expect(AuthManager.getTokens()).toEqual({ accessToken: null, refreshToken: null });
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
    });
});
