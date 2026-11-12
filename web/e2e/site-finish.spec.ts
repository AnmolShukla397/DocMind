import { expect, test } from '@playwright/test'

test('tool previews stay populated and stable through rapid switching', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  await page.locator('#tools').scrollIntoViewIfNeeded()
  const preview = page.locator('.dv-preview')
  const initialHeight = (await preview.boundingBox())!.height
  for (const name of ['Summarize', 'Study', 'Research', 'Ask', 'Study', 'Research']) {
    await page.getByRole('tab', { name, exact: true }).hover()
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(preview).toContainText(`DOCMIND / ${name.toUpperCase()}`)
    expect((await preview.boundingBox())!.height).toBe(initialHeight)
  }
  await page.locator('.dv-finale').scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: 'Open the research studio', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
})

test('custom cursor stays under the pointer on interactive controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  for (const control of [page.getByRole('link', { name: 'Start a library' }), page.getByRole('tab', { name: 'Study', exact: true })]) {
    await control.hover()
    await page.waitForTimeout(80)
    const target = (await control.boundingBox())!
    const cursor = (await page.locator('.dv-cursor').boundingBox())!
    expect(Math.abs(cursor.x + cursor.width / 2 - (target.x + target.width / 2))).toBeLessThan(2)
    expect(Math.abs(cursor.y + cursor.height / 2 - (target.y + target.height / 2))).toBeLessThan(2)
  }
})

test('closing page links to readable site information', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Privacy', exact: true }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy, in plain sight.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Session cookie' })).toBeVisible()
  await page.getByRole('link', { name: /Terms/ }).first().click()
  await expect(page).toHaveURL(/\/terms$/)
  await page.getByRole('link', { name: /Accessibility/ }).first().click()
  await expect(page).toHaveURL(/\/accessibility$/)
  await expect(page.getByRole('heading', { name: 'Reduced motion' })).toBeVisible()
})
