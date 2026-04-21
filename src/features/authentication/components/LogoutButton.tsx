/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

export const LogoutButton = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { accessToken } = AuthManager.useSession();
    const [logout] = requestManager.useLogoutUser();

    if (!accessToken) {
        return null;
    }

    const handleLogout = async () => {
        try {
            await logout();
        } catch (e) {
            makeToast(t('global.error.label.failed_to_save_changes'), 'warning', getErrorMessage(e));
        } finally {
            AuthManager.removeTokens();
            navigate(AppRoutes.authentication.childRoutes.login.path);
        }
    };

    return (
        <Tooltip title={t('global.button.log_out')}>
            <IconButton color="inherit" onClick={handleLogout} aria-label={t('global.button.log_out')}>
                <LogoutIcon />
            </IconButton>
        </Tooltip>
    );
};
