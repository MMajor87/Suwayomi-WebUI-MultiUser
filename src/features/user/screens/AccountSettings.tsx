/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import LogoutIcon from '@mui/icons-material/Logout';
import { PasswordTextField } from '@/base/components/inputs/PasswordTextField.tsx';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';

const MIN_PASSWORD_LENGTH = 10;

export const AccountSettings = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { username, role } = AuthManager.useSession();

    useAppTitle(t('settings.account.title'));

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [changePassword, { loading: isChangingPassword }] = requestManager.useChangePassword();
    const [logout, { loading: isLoggingOut }] = requestManager.useLogoutUser();

    const roleLabel =
        role === UserRole.Admin ? t('settings.account.label.role_admin') : t('settings.account.label.role_user');

    const validatePasswordForm = (): boolean => {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setPasswordError(t('settings.account.error.password_too_short'));
            return false;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError(t('settings.account.error.passwords_do_not_match'));
            return false;
        }
        setPasswordError(null);
        return true;
    };

    const handleChangePassword = async () => {
        if (!validatePasswordForm()) return;

        try {
            await changePassword({ variables: { currentPassword, newPassword } });
            makeToast(t('settings.account.success.password_changed'), 'success');
            AuthManager.removeTokens();
            navigate(AppRoutes.authentication.childRoutes.login.path, { replace: true });
        } catch (e) {
            makeToast(t('global.error.label.failed_to_save_changes'), 'error', getErrorMessage(e));
        }
    };

    const handleSignOutAll = async () => {
        try {
            await logout();
        } catch (e) {
            makeToast(t('global.error.label.failed_to_save_changes'), 'warning', getErrorMessage(e));
        } finally {
            AuthManager.removeTokens();
            navigate(AppRoutes.authentication.childRoutes.login.path, { replace: true });
        }
    };

    const isPasswordFormValid =
        !!currentPassword && newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword;

    return (
        <List sx={{ pt: 0 }}>
            <List
                subheader={
                    <ListSubheader component="div">{t('settings.account.section.profile')}</ListSubheader>
                }
            >
                <ListItem>
                    <ListItemText
                        primary={t('settings.account.label.username')}
                        secondary={username ?? '—'}
                    />
                </ListItem>
                <ListItem>
                    <ListItemText primary={t('settings.account.label.role')} />
                    <Chip label={roleLabel} size="small" color={role === UserRole.Admin ? 'primary' : 'default'} />
                </ListItem>
            </List>

            <Divider />

            <List
                subheader={
                    <ListSubheader component="div">{t('settings.account.section.password')}</ListSubheader>
                }
            >
                <ListItem>
                    <Stack sx={{ width: '100%', gap: 2, pt: 1 }}>
                        {passwordError && <Alert severity="error">{passwordError}</Alert>}
                        <PasswordTextField
                            label={t('settings.account.label.current_password')}
                            variant="outlined"
                            fullWidth
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <PasswordTextField
                            label={t('settings.account.label.new_password')}
                            variant="outlined"
                            fullWidth
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <PasswordTextField
                            label={t('settings.account.label.confirm_password')}
                            variant="outlined"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <Box>
                            <Button
                                variant="contained"
                                disabled={!isPasswordFormValid || isChangingPassword}
                                onClick={handleChangePassword}
                            >
                                {t('settings.account.action.change_password')}
                            </Button>
                        </Box>
                    </Stack>
                </ListItem>
            </List>

            <Divider />

            <List
                subheader={
                    <ListSubheader component="div">{t('settings.account.section.session')}</ListSubheader>
                }
            >
                <ListItemButton onClick={handleSignOutAll} disabled={isLoggingOut}>
                    <LogoutIcon sx={{ mr: 2 }} />
                    <ListItemText
                        primary={t('settings.account.action.sign_out_all')}
                        secondary={t('settings.account.action.sign_out_all_description')}
                    />
                </ListItemButton>
            </List>
        </List>
    );
};
