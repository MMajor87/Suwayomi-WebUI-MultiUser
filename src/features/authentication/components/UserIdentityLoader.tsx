/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

export const UserIdentityLoader = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { accessToken } = AuthManager.useSession();

    const { data } = requestManager.useGetMe({ skip: !accessToken });

    useEffect(() => {
        if (!data?.me) {
            return;
        }

        const { id, username, role, isActive } = data.me;

        if (!isActive) {
            makeToast(t('settings.account.label.inactive_warning'), 'error');
            AuthManager.removeTokens();
            navigate(AppRoutes.authentication.childRoutes.login.path, { replace: true });
            return;
        }

        AuthManager.setUserIdentity(id, username, role as UserRole);
    }, [data?.me]);

    return null;
};
