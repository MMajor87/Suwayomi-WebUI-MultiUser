/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PasswordTextField } from '@/base/components/inputs/PasswordTextField.tsx';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { SplashScreen } from '@/features/authentication/components/SplashScreen.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { GET_NEEDS_SETUP } from '@/lib/graphql/server/ServerInfoQuery.ts';
import { SETUP_INITIAL_ADMIN } from '@/lib/graphql/user/UserMutation.ts';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';

const MIN_PASSWORD_LENGTH = 10;

type NeedsSetupQueryResponse = {
    needsSetup: boolean;
};

type SetupInitialAdminMutationResponse = {
    setupInitialAdmin: {
        user: {
            id: number;
            username: string;
            role: UserRole;
            isActive: boolean;
        };
    };
};

type SetupInitialAdminMutationVariables = {
    input: {
        username: string;
        password: string;
    };
};

export const SetupScreen = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { client } = requestManager.graphQLClient;
    const { setOverride } = useNavBarContext();
    const isAuthenticated = AuthManager.useIsAuthenticated();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const { data, loading: isCheckingSetup } = useQuery<NeedsSetupQueryResponse>(GET_NEEDS_SETUP, {
        client,
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'network-only',
        skip: isAuthenticated,
    });
    const [setupInitialAdmin, { loading: isSubmitting }] = useMutation<
        SetupInitialAdminMutationResponse,
        SetupInitialAdminMutationVariables
    >(SETUP_INITIAL_ADMIN, { client });

    const redirectSearch = useMemo(() => location.search, [location.search]);

    useEffect(() => {
        setOverride({ status: true, value: null });

        return () => setOverride({ status: false, value: null });
    }, []);

    const validateForm = (): string | null => {
        if (!username.trim()) {
            return t('authentication.setup.error.username_required');
        }
        if (!password) {
            return t('authentication.setup.error.password_required');
        }
        if (password !== confirmPassword) {
            return t('authentication.setup.error.passwords_do_not_match');
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return t('authentication.setup.error.password_too_short', { minLength: MIN_PASSWORD_LENGTH });
        }
        if (!password.match(/[A-Z]/)) {
            return t('authentication.setup.error.password_uppercase_required');
        }
        if (!password.match(/[a-z]/)) {
            return t('authentication.setup.error.password_lowercase_required');
        }
        if (!password.match(/[0-9]/)) {
            return t('authentication.setup.error.password_digit_required');
        }

        return null;
    };

    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);

        try {
            await setupInitialAdmin({
                variables: {
                    input: {
                        username: username.trim(),
                        password,
                    },
                },
            });

            client.writeQuery<NeedsSetupQueryResponse>({
                query: GET_NEEDS_SETUP,
                data: { needsSetup: false },
            });

            makeToast(t('authentication.setup.success.admin_created'), 'success');
            navigate(
                { pathname: AppRoutes.authentication.childRoutes.login.path, search: redirectSearch },
                { replace: true },
            );
        } catch (e) {
            setFormError(getErrorMessage(e));
        }
    };

    if (isAuthenticated) {
        return <Navigate to={AppRoutes.root.path} replace />;
    }

    if (isCheckingSetup) {
        return <SplashScreen />;
    }

    if (!data?.needsSetup) {
        return (
            <Navigate
                to={{ pathname: AppRoutes.authentication.childRoutes.login.path, search: redirectSearch }}
                replace
            />
        );
    }

    return (
        <Stack
            sx={{
                [theme.breakpoints.up('lg')]: {
                    flexDirection: 'row',
                },
            }}
        >
            <SplashScreen
                slots={{
                    stackProps: {
                        sx: {
                            position: 'unset',
                            minWidth: 'auto',
                            minHeight: '50vh',
                            flexBasis: '60%',
                            p: 4,
                            [theme.breakpoints.up('lg')]: {
                                minHeight: '0vh',
                                height: '100vh',
                            },
                        },
                    },
                    serverAddressProps: {
                        sx: {
                            display: 'none',
                        },
                    },
                }}
            />
            <Stack
                sx={{
                    position: 'relative',
                    minHeight: '50vh',
                    flexBasis: '40%',
                    p: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    [theme.breakpoints.up('lg')]: {
                        minHeight: '0vh',
                        height: '100vh',
                    },
                }}
            >
                <Stack sx={{ maxWidth: 340, width: '100%', gap: 2 }}>
                    <Stack sx={{ gap: 0.5 }}>
                        <Typography variant="h5">{t('authentication.setup.title')}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('authentication.setup.subtitle')}
                        </Typography>
                    </Stack>
                    {formError && <Alert severity="error">{formError}</Alert>}
                    <Stack>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="setup-username"
                            name="username"
                            label={t('global.label.username')}
                            type="text"
                            fullWidth
                            variant="standard"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            inputProps={{ 'data-testid': 'setup-username' }}
                        />
                        <PasswordTextField
                            margin="dense"
                            fullWidth
                            variant="standard"
                            label={t('global.label.password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            inputProps={{ 'data-testid': 'setup-password' }}
                        />
                        <PasswordTextField
                            margin="dense"
                            fullWidth
                            variant="standard"
                            label={t('authentication.setup.label.confirm_password')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            inputProps={{ 'data-testid': 'setup-confirm-password' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            {t('authentication.setup.label.password_policy', { minLength: MIN_PASSWORD_LENGTH })}
                        </Typography>
                    </Stack>
                    <Button
                        disabled={isSubmitting || !username.trim() || !password || !confirmPassword}
                        variant="contained"
                        onClick={handleSubmit}
                        data-testid="setup-submit"
                    >
                        {t('authentication.setup.action.create_admin')}
                    </Button>
                </Stack>
            </Stack>
        </Stack>
    );
};
