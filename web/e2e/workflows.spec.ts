import { expect, test } from '@playwright/test'

async function revealScrollStory(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * .65) {
      window.scrollTo(0, y)
      await new Promise(resolve => window.setTimeout(resolve, 85))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(750)
}

test('document research from signup through source-backed answer', async ({ page }) => {
  const email = `research-${Date.now()}@example.com`
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await revealScrollStory(page)
  await page.screenshot({ path: 'test-results/01-home.png', fullPage: true })

  await page.getByRole('link', { name: /Start a library/i }).click()
  await expect(page).toHaveURL(/\/auth/)
  await page.getByRole('tab', { name: 'Create account' }).click()
  await page.getByRole('textbox', { name: 'Full name' }).fill('Research Tester')
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-44')
  await page.screenshot({ path: 'test-results/02-signup.png', fullPage: true })
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/app/)
  await expect(page.getByText('My library').first()).toBeVisible()

  await page.locator('input[type=file]').setInputFiles({
    name: 'filtration-study.txt', mimeType: 'text/plain',
    buffer: Buffer.from('The field study measured a 28 percent improvement in water quality after three filtration trials. The authors recommend seasonal monitoring before broad deployment.'),
  })
  await expect(page.getByText('1 document is ready to search.')).toBeVisible()
  await page.getByRole('textbox', { name: 'Ask your documents' }).fill('What improvement did filtration produce?')
  await page.getByRole('button', { name: /^Ask/ }).click()
  await expect(page.getByText(/28 percent improvement/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /filtration-study.txt.*Open passage/ })).toBeVisible()
  await page.getByRole('button', { name: /filtration-study.txt.*Open passage/ }).click()
  await expect(page.getByText('See the passage')).toBeVisible()
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'test-results/03-research.png', fullPage: true })
  await page.getByRole('button', { name: 'Close source inspector' }).first().click()

  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Create flashcards' }).click()
  await expect(page.getByText(/Card 1/)).toBeVisible()
  await page.screenshot({ path: 'test-results/04-study.png', fullPage: true })

  await page.getByRole('button', { name: /Account menu for Research Tester/ }).click()
  await page.getByRole('button', { name: /Sign out/ }).click()
  await expect(page).toHaveURL(/\/auth/)
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-44')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app/)
  await expect(page.getByText('filtration-study.txt').first()).toBeVisible()
})

test('mobile public navigation and account entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await revealScrollStory(page)
  await page.screenshot({ path: 'test-results/05-mobile-home.png', fullPage: true })
  await page.getByRole('link', { name: /Open DocMind/i }).first().click()
  await expect(page).toHaveURL(/\/auth/)
  await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible()
})
