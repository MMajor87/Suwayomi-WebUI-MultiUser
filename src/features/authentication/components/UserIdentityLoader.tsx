/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect } from 'react';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { UserRole } from '@/lib/graphql/generated/graphql.ts';

export const UserIdentityLoader = () => {
    const { accessToken } = AuthManager.useSession();

    const { data } = requestManager.useGetMe({ skip: !accessToken });

    useEffect(() => {
        if (!data?.me) {
            return;
        }

        const { id, username, role } = data.me;
        AuthManager.setUserIdentity(id, username, role as UserRole);
    }, [data?.me]);

    return null;
};
