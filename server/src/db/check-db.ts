import { query } from './index'

async function check() {
  try {
    const h = await query('SELECT id FROM "Household" LIMIT 5')
    console.log('Households:', JSON.stringify(h.rows))
    const r = await query('SELECT count(*) FROM "Recipe"')
    console.log('Recipe count:', r.rows[0].count)
    const t = await query('SELECT count(*) FROM "RecipeTag"')
    console.log('Tag count:', t.rows[0].count)
    const ing = await query('SELECT count(*) FROM "Ingredient"')
    console.log('Ingredient count:', ing.rows[0].count)
    const u = await query('SELECT count(*) FROM "Unit"')
    console.log('Unit count:', u.rows[0].count)
  } catch (err) {
    console.error('Check error:', err)
  } finally {
    process.exit(0)
  }
}

check()
