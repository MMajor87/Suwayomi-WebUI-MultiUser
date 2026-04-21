/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { expect, test } from '@playwright/test';
import { hasRequiredEnv, requireEnv } from '@/../e2e/helpers';

const canRun =
    process.env.E2E_RUN === '1' &&
    hasRequiredEnv('E2E_FIRST_RUN_BASE_URL', 'E2E_SETUP_ADMIN_USER', 'E2E_SETUP_ADMIN_PASS');

test.describe('First-Run Setup Flow', () => {
    test.skip(!canRun, 'Set E2E_RUN=1 and first-run setup env vars to execute this flow.');

    test('fresh server redirects to setup, creates admin, then logs in', async ({ page }) => {
        const firstRunBaseUrl = requireEnv('E2E_FIRST_RUN_BASE_URL').replace(/\/$/, '');
        const username = requireEnv('E2E_SETUP_ADMIN_USER');
        const password = requireEnv('E2E_SETUP_ADMIN_PASS');

        await page.goto(`${firstRunBaseUrl}/auth/login`);
        await expect(page).toHaveURL(/\/auth\/setup/);

        await page.getByTestId('setup-username').fill(username);
        await page.getByTestId('setup-password').fill(password);
        await page.getByTestId('setup-confirm-password').fill(password);
        await page.getByTestId('setup-submit').click();

        await expect(page).toHaveURL(/\/auth\/login/);

        await page.getByTestId('login-username').fill(username);
        await page.getByTestId('login-password').fill(password);
        await page.getByTestId('login-submit').click();

        await expect(page).toHaveURL(/\/library/);
    });
});
