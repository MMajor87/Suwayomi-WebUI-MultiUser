/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { expect, Page } from '@playwright/test';

export const hasRequiredEnv = (...keys: string[]): boolean => keys.every((key) => !!process.env[key]);

export const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
};

export const loginThroughUi = async (page: Page, credentials: { username: string; password: string }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-username').fill(credentials.username);
    await page.getByTestId('login-password').fill(credentials.password);
    await page.getByTestId('login-submit').click();
    await expect(page).not.toHaveURL(/\/auth\/login/);
};
