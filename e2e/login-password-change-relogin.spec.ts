/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { expect, test } from '@playwright/test';
import { hasRequiredEnv, loginThroughUi, requireEnv } from '@/../e2e/helpers';

const canRun = process.env.E2E_RUN === '1' && hasRequiredEnv('E2E_ADMIN_USER', 'E2E_ADMIN_PASS', 'E2E_ADMIN_NEW_PASS');

test.describe('Account Password Flow', () => {
    test.skip(!canRun, 'Set E2E_RUN=1 and admin credentials env vars to execute this flow.');

    test('login -> change password -> re-login with new password', async ({ page }) => {
        const adminUser = requireEnv('E2E_ADMIN_USER');
        const adminPassword = requireEnv('E2E_ADMIN_PASS');
        const adminNewPassword = requireEnv('E2E_ADMIN_NEW_PASS');

        await loginThroughUi(page, { username: adminUser, password: adminPassword });

        await page.goto('/settings/account');
        await page.getByTestId('account-current-password').fill(adminPassword);
        await page.getByTestId('account-new-password').fill(adminNewPassword);
        await page.getByTestId('account-confirm-password').fill(adminNewPassword);
        await page.getByTestId('account-change-password').click();

        await expect(page).toHaveURL(/\/auth\/login/);

        await page.getByTestId('login-username').fill(adminUser);
        await page.getByTestId('login-password').fill(adminNewPassword);
        await page.getByTestId('login-submit').click();

        await expect(page).toHaveURL(/\/library/);
    });
});
