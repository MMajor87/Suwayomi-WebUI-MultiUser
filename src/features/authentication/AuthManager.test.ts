/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { BaseClient } from '@/lib/requests/client/BaseClient.ts';

class TestBaseClient extends BaseClient<Record<string, never>, Record<string, never>, null> {
    protected client = {};

    public readonly fetcher = null;

    public static executeRefresh(refreshFn: any) {
        return this.refreshAccessToken(refreshFn as any);
    }

    public constructor() {
        super(() => ({ response: Promise.reject(new Error('unused')), abortRequest: () => {} }) as any);
    }

    public updateConfig(): void {}
}

const resetAuthState = () => {
    AuthManager.removeTokens();
    AuthManager.clearUserIdentity();
    AuthManager.setIsRefreshingToken(false);
    AuthManager.setAuthInitialized(false);
    AuthManager.setAuthRequired(null);
    BaseClient.setTokenRefreshCompleteCallback(null);
};

describe('AuthManager + token refresh', () => {
    beforeEach(() => {
        resetAuthState();
    });

    it('starts unauthenticated with empty identity', () => {
        expect(AuthManager.getTokens()).toEqual({ accessToken: null, refreshToken: null });
        expect(AuthManager.getUserId()).toBeNull();
        expect(AuthManager.getUsername()).toBeNull();
        expect(AuthManager.getRole()).toBeNull();
        expect(AuthManager.isAuthInitialized()).toBe(false);
    });

    it('stores identity and clears it on logout', () => {
        AuthManager.setTokens('access-token', 'refresh-token');
        AuthManager.setUserIdentity(17, 'admin_user', UserRole.Admin);

        expect(AuthManager.getAccessToken()).toBe('access-token');
        expect(AuthManager.getRefreshToken()).toBe('refresh-token');
        expect(AuthManager.getUserId()).toBe(17);
        expect(AuthManager.isAdmin()).toBe(true);

        AuthManager.removeTokens();

        expect(AuthManager.getTokens()).toEqual({ accessToken: null, refreshToken: null });
        expect(AuthManager.getUserId()).toBeNull();
        expect(AuthManager.getUsername()).toBeNull();
        expect(AuthManager.getRole()).toBeNull();
    });

    it('refreshes access token and rotates refresh token', async () => {
        AuthManager.setRefreshToken('refresh-old');

        const onRefreshComplete = vi.fn();
        BaseClient.setTokenRefreshCompleteCallback(onRefreshComplete);

        await TestBaseClient.executeRefresh(() => ({
            response: Promise.resolve({
                data: {
                    refreshToken: {
                        accessToken: 'access-new',
                        refreshToken: 'refresh-new',
                    },
                },
            }),
            abortRequest: () => {},
        }));

        expect(AuthManager.getTokens()).toEqual({
            accessToken: 'access-new',
            refreshToken: 'refresh-new',
        });
        expect(AuthManager.isRefreshingToken()).toBe(false);
        expect(onRefreshComplete).toHaveBeenCalledTimes(1);
    });

    it('clears tokens when refresh fails', async () => {
        AuthManager.setTokens('access-old', 'refresh-old');

        await expect(
            TestBaseClient.executeRefresh(() => ({
                response: Promise.resolve({ data: undefined }),
                abortRequest: () => {},
            })),
        ).rejects.toThrow('No refreshed access token returned');

        expect(AuthManager.getTokens()).toEqual({ accessToken: null, refreshToken: null });
    });
});
