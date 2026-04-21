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
import { SetupScreen } from '@/features/authentication/screens/SetupScreen.tsx';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { GET_NEEDS_SETUP } from '@/lib/graphql/server/ServerInfoQuery.ts';

const mockNavigate = vi.fn();
const mockSetOverride = vi.fn();
const mockWriteQuery = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const setupMutation = vi.fn();

vi.mock('@apollo/client', async () => {
    const actual = await vi.importActual('@apollo/client');
    return {
        ...actual,
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
        useMutation: (...args: unknown[]) => mockUseMutation(...args),
        useApolloClient: () => ({
            writeQuery: mockWriteQuery,
        }),
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useLocation: () => ({ search: '?redirect=/library' }),
        useNavigate: () => mockNavigate,
        Navigate: ({ to }: { to: string | { pathname: string } }) => (
            <div data-testid="navigate" data-target={typeof to === 'string' ? to : to.pathname} />
        ),
    };
});

vi.mock('@/features/navigation-bar/NavbarContext.tsx', () => ({
    useNavBarContext: () => ({
        setOverride: mockSetOverride,
    }),
}));

vi.mock('@/features/authentication/components/SplashScreen.tsx', () => ({
    SplashScreen: () => <div data-testid="splash-screen" />,
}));

vi.mock('@/base/utils/Toast.ts', () => ({
    makeToast: vi.fn(),
}));

const resetAuthState = () => {
    AuthManager.removeTokens();
    AuthManager.clearUserIdentity();
    AuthManager.setAuthRequired(true);
    AuthManager.setAuthInitialized(true);
};

describe('SetupScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetAuthState();
        mockUseMutation.mockReturnValue([setupMutation, { loading: false }]);
    });

    it('renders setup form when needsSetup is true', () => {
        mockUseQuery.mockReturnValue({ data: { needsSetup: true }, loading: false });

        render(<SetupScreen />);

        expect(screen.getByText('authentication.setup.title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'authentication.setup.action.create_admin' })).toBeInTheDocument();
    });

    it('redirects to login when needsSetup is false', () => {
        mockUseQuery.mockReturnValue({ data: { needsSetup: false }, loading: false });

        render(<SetupScreen />);

        const navigateMarker = screen.getByTestId('navigate');
        expect(navigateMarker).toBeInTheDocument();
        expect(navigateMarker).toHaveAttribute('data-target', '/auth/login');
    });

    it('submits initial admin setup mutation with form values', async () => {
        setupMutation.mockResolvedValue({ data: { setupInitialAdmin: { user: { id: 1 } } } });
        mockUseQuery.mockReturnValue({ data: { needsSetup: true }, loading: false });

        render(<SetupScreen />);

        const user = userEvent.setup();
        await user.type(screen.getByTestId('setup-username'), 'first_admin');
        await user.type(screen.getByTestId('setup-password'), 'Password123');
        await user.type(screen.getByTestId('setup-confirm-password'), 'Password123');
        await user.click(screen.getByTestId('setup-submit'));

        await waitFor(() => {
            expect(setupMutation).toHaveBeenCalledWith({
                variables: {
                    input: {
                        username: 'first_admin',
                        password: 'Password123',
                    },
                },
            });
        });

        expect(mockWriteQuery).toHaveBeenCalledWith({
            query: GET_NEEDS_SETUP,
            data: { needsSetup: false },
        });
        expect(mockNavigate).toHaveBeenCalledWith(
            { pathname: '/auth/login', search: '?redirect=/library' },
            { replace: true },
        );
    });
});
