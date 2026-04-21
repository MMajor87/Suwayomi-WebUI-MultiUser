/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { expect, test } from '@playwright/test';
import { hasRequiredEnv, loginThroughUi, requireEnv } from '@/../e2e/helpers';

const canRun = process.env.E2E_RUN === '1' && hasRequiredEnv('E2E_ADMIN_USER', 'E2E_ADMIN_PASS', 'E2E_TEST_USER_PASS');

test.describe('Admin User Lifecycle Flow', () => {
    test.skip(!canRun, 'Set E2E_RUN=1 and required admin/test-user env vars to execute this flow.');

    test('admin creates user, deactivates user, then user login fails', async ({ page, context }) => {
        const adminUser = requireEnv('E2E_ADMIN_USER');
        const adminPassword = requireEnv('E2E_ADMIN_PASS');
        const testUserPassword = requireEnv('E2E_TEST_USER_PASS');
        const createdUsername = `pw_e2e_${Date.now()}`;

        await loginThroughUi(page, { username: adminUser, password: adminPassword });
        await page.goto('/settings/users');

        await page.getByTestId('user-management-create-user').click();
        await page.getByTestId('user-management-create-username').fill(createdUsername);
        await page.getByTestId('user-management-create-password').fill(testUserPassword);
        await page.getByTestId('user-management-create-submit').click();

        const createdRow = page.locator('tr', { hasText: createdUsername });
        await expect(createdRow).toBeVisible();

        await createdRow.locator('button[data-testid^="user-toggle-active-"]').click();

        const loginPage = await context.newPage();
        await loginPage.goto('/auth/login');
        await loginPage.getByTestId('login-username').fill(createdUsername);
        await loginPage.getByTestId('login-password').fill(testUserPassword);
        await loginPage.getByTestId('login-submit').click();

        await expect(loginPage).toHaveURL(/\/auth\/login/);
    });
});
