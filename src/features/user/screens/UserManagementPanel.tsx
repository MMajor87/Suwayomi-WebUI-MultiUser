/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { PasswordTextField } from '@/base/components/inputs/PasswordTextField.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { dateTimeFormatter } from '@/base/utils/DateHelper.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import {
    CREATE_USER,
    DEACTIVATE_USER,
    DELETE_USER,
    FORCE_SIGN_OUT_USER,
    REACTIVATE_USER,
    UPDATE_USER,
} from '@/lib/graphql/user/UserMutation.ts';
import { GET_USERS } from '@/lib/graphql/user/UserQuery.ts';

const MIN_PASSWORD_LENGTH = 10;
const DEFAULT_ROWS_PER_PAGE = 10;

type UserAccountItem = {
    id: number;
    username: string;
    role: UserRole;
    isActive: boolean;
    createdAt: number;
};

type GetUsersResponse = {
    users: UserAccountItem[];
};

type GetUsersVariables = {
    includeInactive: boolean;
};

type CreateUserResponse = {
    createUser: {
        user: UserAccountItem;
    };
};

type CreateUserVariables = {
    input: {
        username: string;
        password: string;
        role: UserRole;
        isActive: boolean;
    };
};

type UpdateUserResponse = {
    updateUser: {
        user: UserAccountItem;
    };
};

type UpdateUserVariables = {
    input: {
        id: number;
        patch: {
            username: string;
            role: UserRole;
        };
    };
};

type ToggleUserVariables = {
    input: {
        id: number;
    };
};

type ForceSignOutResponse = {
    forceSignOutUser: {
        success: boolean;
    };
};

type DeleteUserResponse = {
    deleteUser: {
        success: boolean;
    };
};

type CreateUserForm = {
    username: string;
    password: string;
    role: UserRole;
    isActive: boolean;
};

const createDefaultCreateUserForm = (): CreateUserForm => ({
    username: '',
    password: '',
    role: UserRole.User,
    isActive: true,
});

export const UserManagementPanel = () => {
    const { t } = useTranslation();
    const { role, userId: currentUserId } = AuthManager.useSession();
    const isAdmin = role === UserRole.Admin;

    useAppTitle(t('settings.user_management.title'));

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateUserForm>(createDefaultCreateUserForm);
    const [createFormError, setCreateFormError] = useState<string | null>(null);

    const [editTarget, setEditTarget] = useState<UserAccountItem | null>(null);
    const [editUsername, setEditUsername] = useState('');
    const [editRole, setEditRole] = useState<UserRole>(UserRole.User);
    const [editFormError, setEditFormError] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<UserAccountItem | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const {
        data,
        loading,
        error,
        refetch: refetchUsers,
    } = useQuery<GetUsersResponse, GetUsersVariables>(GET_USERS, {
        variables: { includeInactive: true },
        notifyOnNetworkStatusChange: true,
        skip: !isAdmin,
    });

    const [createUser, { loading: isCreatingUser }] = useMutation<CreateUserResponse, CreateUserVariables>(CREATE_USER);
    const [updateUser, { loading: isUpdatingUser }] = useMutation<UpdateUserResponse, UpdateUserVariables>(UPDATE_USER);
    const [deactivateUser, { loading: isDeactivatingUser }] = useMutation<
        { deactivateUser: { user: UserAccountItem } },
        ToggleUserVariables
    >(DEACTIVATE_USER);
    const [reactivateUser, { loading: isReactivatingUser }] = useMutation<
        { reactivateUser: { user: UserAccountItem } },
        ToggleUserVariables
    >(REACTIVATE_USER);
    const [forceSignOutUser, { loading: isForceSignOutLoading }] = useMutation<
        ForceSignOutResponse,
        ToggleUserVariables
    >(FORCE_SIGN_OUT_USER);
    const [deleteUser, { loading: isDeletingUser }] = useMutation<DeleteUserResponse, ToggleUserVariables>(DELETE_USER);

    const users = useMemo(
        () => [...(data?.users ?? [])].sort((first, second) => first.username.localeCompare(second.username)),
        [data?.users],
    );

    const activeAdminCount = useMemo(
        () => users.filter((user) => user.role === UserRole.Admin && user.isActive).length,
        [users],
    );

    const paginatedUsers = useMemo(
        () => users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [users, page, rowsPerPage],
    );

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(users.length / rowsPerPage) - 1);
        if (page > maxPage) {
            setPage(maxPage);
        }
    }, [users.length, rowsPerPage, page]);

    const isMutating =
        isCreatingUser ||
        isUpdatingUser ||
        isDeactivatingUser ||
        isReactivatingUser ||
        isForceSignOutLoading ||
        isDeletingUser;

    const isLastActiveAdminUser = (user: UserAccountItem): boolean =>
        user.role === UserRole.Admin && user.isActive && activeAdminCount <= 1;

    const validatePasswordPolicy = (password: string): string | null => {
        if (password.length < MIN_PASSWORD_LENGTH) {
            return t('settings.user_management.error.password_too_short', { minLength: MIN_PASSWORD_LENGTH });
        }
        if (!password.match(/[A-Z]/)) {
            return t('settings.user_management.error.password_uppercase_required');
        }
        if (!password.match(/[a-z]/)) {
            return t('settings.user_management.error.password_lowercase_required');
        }
        if (!password.match(/[0-9]/)) {
            return t('settings.user_management.error.password_digit_required');
        }

        return null;
    };

    const reloadUsers = async () => {
        await refetchUsers({ includeInactive: true });
    };

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setCreateForm(createDefaultCreateUserForm());
        setCreateFormError(null);
    };

    const openEditDialog = (user: UserAccountItem) => {
        setEditTarget(user);
        setEditUsername(user.username);
        setEditRole(user.role);
        setEditFormError(null);
    };

    const closeEditDialog = () => {
        setEditTarget(null);
        setEditUsername('');
        setEditRole(UserRole.User);
        setEditFormError(null);
    };

    const closeDeleteDialog = () => {
        setDeleteTarget(null);
        setDeleteError(null);
    };

    const handleCreateUser = async () => {
        const normalizedUsername = createForm.username.trim();

        if (!normalizedUsername) {
            setCreateFormError(t('settings.user_management.error.username_required'));
            return;
        }

        const passwordPolicyError = validatePasswordPolicy(createForm.password);
        if (passwordPolicyError) {
            setCreateFormError(passwordPolicyError);
            return;
        }

        setCreateFormError(null);

        try {
            await createUser({
                variables: {
                    input: {
                        username: normalizedUsername,
                        password: createForm.password,
                        role: createForm.role,
                        isActive: createForm.isActive,
                    },
                },
            });
            makeToast(t('settings.user_management.success.user_created'), 'success');
            closeCreateDialog();
            await reloadUsers();
        } catch (e) {
            setCreateFormError(getErrorMessage(e));
        }
    };

    const handleEditUser = async () => {
        if (!editTarget) {
            return;
        }

        const normalizedUsername = editUsername.trim();
        if (!normalizedUsername) {
            setEditFormError(t('settings.user_management.error.username_required'));
            return;
        }

        if (isLastActiveAdminUser(editTarget) && editRole !== UserRole.Admin) {
            setEditFormError(t('settings.user_management.error.last_active_admin_guard'));
            return;
        }

        setEditFormError(null);

        try {
            await updateUser({
                variables: {
                    input: {
                        id: editTarget.id,
                        patch: {
                            username: normalizedUsername,
                            role: editRole,
                        },
                    },
                },
            });
            makeToast(t('settings.user_management.success.user_updated'), 'success');
            closeEditDialog();
            await reloadUsers();
        } catch (e) {
            setEditFormError(getErrorMessage(e));
        }
    };

    const handleToggleActive = async (user: UserAccountItem) => {
        try {
            if (user.isActive) {
                await deactivateUser({ variables: { input: { id: user.id } } });
                makeToast(t('settings.user_management.success.user_deactivated'), 'success');
            } else {
                await reactivateUser({ variables: { input: { id: user.id } } });
                makeToast(t('settings.user_management.success.user_reactivated'), 'success');
            }
            await reloadUsers();
        } catch (e) {
            makeToast(t('global.error.label.failed_to_save_changes'), 'error', getErrorMessage(e));
        }
    };

    const handleForceSignOut = async (user: UserAccountItem) => {
        try {
            await forceSignOutUser({ variables: { input: { id: user.id } } });
            makeToast(t('settings.user_management.success.user_sessions_invalidated'), 'success');
        } catch (e) {
            makeToast(t('global.error.label.failed_to_save_changes'), 'error', getErrorMessage(e));
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteTarget) {
            return;
        }

        setDeleteError(null);

        try {
            await deleteUser({ variables: { input: { id: deleteTarget.id } } });
            makeToast(t('settings.user_management.success.user_deleted'), 'success');
            closeDeleteDialog();
            await reloadUsers();
        } catch (e) {
            setDeleteError(getErrorMessage(e));
        }
    };

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRowsPerPage(Number(event.target.value));
        setPage(0);
    };

    if (!isAdmin) {
        return <EmptyViewAbsoluteCentered message={t('settings.user_management.error.admin_only')} />;
    }

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t('global.error.label.failed_to_load_data')}
                messageExtra={getErrorMessage(error)}
                retry={() => {
                    reloadUsers().catch(defaultPromiseErrorHandler('UserManagementPanel::reloadUsers'));
                }}
            />
        );
    }

    const isEditingLastActiveAdmin = !!editTarget && isLastActiveAdminUser(editTarget);
    const isEditUnchanged = !!editTarget && editTarget.username === editUsername.trim() && editTarget.role === editRole;

    return (
        <Stack sx={{ px: 2, py: 2, gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">{t('settings.user_management.title')}</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={isMutating}
                    data-testid="user-management-create-user"
                >
                    {t('settings.user_management.action.create_user')}
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('settings.user_management.label.username')}</TableCell>
                            <TableCell>{t('settings.user_management.label.role')}</TableCell>
                            <TableCell>{t('settings.user_management.label.status')}</TableCell>
                            <TableCell>{t('settings.user_management.label.created_at')}</TableCell>
                            <TableCell align="right">{t('settings.user_management.label.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedUsers.map((user) => {
                            const isLastActiveAdmin = isLastActiveAdminUser(user);
                            const isCurrentUser = user.id === currentUserId;
                            const deactivateDisabled = user.isActive && isLastActiveAdmin;
                            const deleteDisabled = isLastActiveAdmin;
                            const downgradeDisabled = isCurrentUser && isLastActiveAdmin;
                            const createdAtText = user.createdAt > 0 ? dateTimeFormatter.format(user.createdAt) : '-';
                            let roleLabel = t('settings.account.label.role_user');
                            if (user.role === UserRole.Admin) {
                                roleLabel = t('settings.account.label.role_admin');
                            }
                            let statusLabel = t('settings.user_management.label.inactive');
                            if (user.isActive) {
                                statusLabel = t('settings.user_management.label.active');
                            }
                            let toggleActionTitle = t('settings.user_management.action.reactivate');
                            if (deactivateDisabled) {
                                toggleActionTitle = t('settings.user_management.error.last_active_admin_guard');
                            } else if (user.isActive) {
                                toggleActionTitle = t('settings.user_management.action.deactivate');
                            }
                            let deleteActionTitle = t('global.button.delete');
                            if (deleteDisabled) {
                                deleteActionTitle = t('settings.user_management.error.last_active_admin_guard');
                            }

                            return (
                                <TableRow key={user.id} hover data-testid={`user-row-${user.id}`}>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            color={user.role === UserRole.Admin ? 'primary' : 'default'}
                                            label={roleLabel}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            color={user.isActive ? 'success' : 'default'}
                                            label={statusLabel}
                                        />
                                    </TableCell>
                                    <TableCell>{createdAtText}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={t('global.button.edit')}>
                                            <span>
                                                <IconButton
                                                    onClick={() => openEditDialog(user)}
                                                    disabled={isMutating}
                                                    size="small"
                                                    aria-label={t('global.button.edit')}
                                                    data-testid={`user-edit-${user.id}`}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={toggleActionTitle}>
                                            <span>
                                                <IconButton
                                                    onClick={() => handleToggleActive(user)}
                                                    disabled={isMutating || deactivateDisabled}
                                                    size="small"
                                                    aria-label={
                                                        user.isActive
                                                            ? t('settings.user_management.action.deactivate')
                                                            : t('settings.user_management.action.reactivate')
                                                    }
                                                    data-testid={`user-toggle-active-${user.id}`}
                                                >
                                                    {user.isActive ? (
                                                        <PersonOffIcon fontSize="small" />
                                                    ) : (
                                                        <PersonIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={t('settings.user_management.action.force_sign_out')}>
                                            <span>
                                                <IconButton
                                                    onClick={() => handleForceSignOut(user)}
                                                    disabled={isMutating}
                                                    size="small"
                                                    aria-label={t('settings.user_management.action.force_sign_out')}
                                                    data-testid={`user-force-signout-${user.id}`}
                                                >
                                                    <LogoutIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={deleteActionTitle}>
                                            <span>
                                                <IconButton
                                                    onClick={() => {
                                                        setDeleteTarget(user);
                                                        setDeleteError(null);
                                                    }}
                                                    disabled={isMutating || deleteDisabled}
                                                    color="error"
                                                    size="small"
                                                    aria-label={t('global.button.delete')}
                                                    data-testid={`user-delete-${user.id}`}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        {downgradeDisabled && (
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                {t('settings.user_management.error.last_active_admin_guard')}
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!paginatedUsers.length && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    {t('settings.user_management.label.no_users')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={users.length}
                    page={page}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </TableContainer>

            <Dialog open={isCreateDialogOpen} onClose={closeCreateDialog} fullWidth maxWidth="sm">
                <DialogTitle>{t('settings.user_management.dialog.create.title')}</DialogTitle>
                <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {createFormError && <Alert severity="error">{createFormError}</Alert>}
                    <TextField
                        label={t('settings.user_management.label.username')}
                        value={createForm.username}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                        fullWidth
                        inputProps={{ 'data-testid': 'user-management-create-username' }}
                    />
                    <PasswordTextField
                        label={t('settings.user_management.label.password')}
                        value={createForm.password}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                        fullWidth
                        inputProps={{ 'data-testid': 'user-management-create-password' }}
                    />
                    <TextField
                        select
                        label={t('settings.user_management.label.role')}
                        value={createForm.role}
                        onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
                        }
                        fullWidth
                        inputProps={{ 'data-testid': 'user-management-create-role' }}
                    >
                        <MenuItem value={UserRole.Admin}>{t('settings.account.label.role_admin')}</MenuItem>
                        <MenuItem value={UserRole.User}>{t('settings.account.label.role_user')}</MenuItem>
                    </TextField>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={createForm.isActive}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))
                                }
                                inputProps={{ 'data-testid': 'user-management-create-active' }}
                            />
                        }
                        label={t('settings.user_management.label.active')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeCreateDialog}>{t('global.button.cancel')}</Button>
                    <Button
                        onClick={handleCreateUser}
                        variant="contained"
                        disabled={isCreatingUser}
                        data-testid="user-management-create-submit"
                    >
                        {t('global.button.create')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!editTarget} onClose={closeEditDialog} fullWidth maxWidth="sm">
                <DialogTitle>{t('settings.user_management.dialog.edit.title')}</DialogTitle>
                <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {editFormError && <Alert severity="error">{editFormError}</Alert>}
                    <TextField
                        label={t('settings.user_management.label.username')}
                        value={editUsername}
                        onChange={(event) => setEditUsername(event.target.value)}
                        fullWidth
                    />
                    <TextField
                        select
                        label={t('settings.user_management.label.role')}
                        value={editRole}
                        onChange={(event) => setEditRole(event.target.value as UserRole)}
                        fullWidth
                    >
                        <MenuItem value={UserRole.Admin}>{t('settings.account.label.role_admin')}</MenuItem>
                        <MenuItem value={UserRole.User} disabled={isEditingLastActiveAdmin}>
                            {t('settings.account.label.role_user')}
                        </MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditDialog}>{t('global.button.cancel')}</Button>
                    <Button
                        onClick={handleEditUser}
                        variant="contained"
                        disabled={
                            isUpdatingUser ||
                            !editUsername.trim() ||
                            isEditUnchanged ||
                            (isEditingLastActiveAdmin && editRole !== UserRole.Admin)
                        }
                    >
                        {t('global.button.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!deleteTarget} onClose={closeDeleteDialog} fullWidth maxWidth="sm">
                <DialogTitle>{t('settings.user_management.dialog.delete.title')}</DialogTitle>
                <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {deleteError && <Alert severity="error">{deleteError}</Alert>}
                    <Typography>
                        {t('settings.user_management.dialog.delete.message', {
                            username: deleteTarget?.username ?? '',
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteDialog}>{t('global.button.cancel')}</Button>
                    <Button
                        onClick={handleDeleteUser}
                        color="error"
                        variant="contained"
                        disabled={isDeletingUser}
                        data-testid="user-management-delete-confirm"
                    >
                        {t('global.button.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};
