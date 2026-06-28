const BASE_MEALS = {
  breakfast: [
    { id: 'b1', name: 'Protein Oat Bowl', desc: 'Oats 90g + whey 1.5 scoops + blueberries 150g + almond butter 1 tbsp', kcal: 707, protein: 52, fat: 17, carbs: 90 },
    { id: 'b2', name: 'Overnight Oats', desc: 'Oats 60g + Fairlife 250ml + Greek yogurt 100g + chia 10g + berries 100g + almond butter', kcal: 560, protein: 38, fat: 16, carbs: 62 },
    { id: 'b3', name: 'Greek Yogurt Parfait', desc: 'Greek yogurt 0% 250g + berries 100g + oats 40g + honey', kcal: 420, protein: 38, fat: 2, carbs: 62 },
    { id: 'b4', name: 'Egg White Scramble', desc: 'Egg whites 6 + 1 whole egg + spinach + feta + toast', kcal: 480, protein: 45, fat: 12, carbs: 46 },
    { id: 'b5', name: 'Protein Pancakes', desc: 'Oats 80g + 2 eggs + whey + banana + blueberries', kcal: 550, protein: 46, fat: 12, carbs: 68 },
    { id: 'b6', name: 'Starbucks Recovery Day', desc: 'Egg white bites x2 + oatmeal + 25g whey', kcal: 560, protein: 54, fat: 13, carbs: 45 },
  ],
  lunch: [
    { id: 'l1', name: 'Chicken Rice Bowl', desc: 'Chicken 200g + basmati rice 1 cup + spinach + EVOO + salsa', kcal: 625, protein: 69, fat: 12, carbs: 55 },
    { id: 'l2', name: 'Chicken Sweet Potato Bowl', desc: 'Chicken 200g + sweet potato 200g + spinach + avocado', kcal: 620, protein: 64, fat: 18, carbs: 58 },
    { id: 'l3', name: 'Turmeric Chicken Quinoa', desc: 'Chicken 200g + quinoa 1 cup + broccoli + turmeric + cumin', kcal: 580, protein: 62, fat: 16, carbs: 48 },
    { id: 'l4', name: 'Chicken Lentil Soup Bowl', desc: 'Chicken 200g + lentil soup half can + rice 1 cup + spinach', kcal: 600, protein: 65, fat: 8, carbs: 68 },
    { id: 'l5', name: 'Salmon Rice Avocado Bowl', desc: 'Salmon 150g + rice 1 cup + avocado + greens', kcal: 580, protein: 48, fat: 22, carbs: 52 },
    { id: 'l6', name: 'Flaked Salmon Quinoa Bowl', desc: 'Salmon 150g + quinoa + broccoli + spinach + EVOO', kcal: 570, protein: 50, fat: 20, carbs: 48 },
  ],
  dinner: [
    { id: 'd1', name: 'Garlic Lemon Herb Salmon', desc: 'Salmon 170g + sweet potato + spinach + EVOO + lemon', kcal: 605, protein: 45, fat: 28, carbs: 44 },
    { id: 'd2', name: 'Turmeric Ginger Salmon Bowl', desc: 'Salmon 170g + rice + broccoli + turmeric + ginger', kcal: 620, protein: 48, fat: 24, carbs: 56 },
    { id: 'd3', name: 'Honey Garlic Glazed Salmon', desc: 'Salmon 170g + sweet potato + broccoli + honey garlic', kcal: 640, protein: 46, fat: 26, carbs: 58 },
    { id: 'd4', name: 'Garlic Herb Chicken Mash', desc: 'Chicken 220g + sweet potato mash + spinach + herbs', kcal: 580, protein: 62, fat: 14, carbs: 52 },
    { id: 'd5', name: 'Turmeric Chicken Lentil', desc: 'Chicken 220g + turmeric + rice + lentil soup', kcal: 650, protein: 68, fat: 14, carbs: 72 },
    { id: 'd6', name: 'Lemon Pepper Chicken Broccoli', desc: 'Chicken 220g + broccoli + avocado + EVOO', kcal: 560, protein: 60, fat: 24, carbs: 22 },
  ],
  snack: [
    { id: 's1', name: 'Yogurt Berries Almonds', desc: 'Greek yogurt + strawberries + almonds + rice cakes', kcal: 292, protein: 25, fat: 7, carbs: 32 },
    { id: 's2', name: 'Cottage Cheese Banana', desc: 'Cottage cheese + banana + walnuts', kcal: 310, protein: 28, fat: 8, carbs: 34 },
    { id: 's3', name: 'Whey Apple Almond Butter', desc: 'Whey 1.5 scoops + apple + almond butter', kcal: 320, protein: 36, fat: 10, carbs: 30 },
    { id: 's4', name: 'Fairlife Oats Berries', desc: 'Fairlife 300ml + oats 40g + blueberries', kcal: 380, protein: 30, fat: 7, carbs: 55 },
  ],
}

const RECIPES = {
  b1: {
    servings: 3,
    prepTime: '10 min active',
    ingredients: ['270g rolled oats', '4.5 scoops whey', '450g blueberries', '3 tbsp almond butter', 'Cinnamon', 'Water or Fairlife as needed'],
    steps: ['Portion oats, whey, and cinnamon into 3 containers.', 'Keep blueberries and almond butter separate until serving.', 'Add liquid, microwave or soak, then top with berries and almond butter.'],
    storage: 'Dry mix 5 days. Add fruit within 2 days.',
  },
  b2: {
    servings: 4,
    prepTime: '12 min active',
    ingredients: ['240g rolled oats', '1L Fairlife milk', '400g 0% Greek yogurt', '40g chia', '400g berries', '4 tbsp almond butter'],
    steps: ['Mix oats, Fairlife, yogurt, and chia in a large bowl.', 'Divide into 4 jars.', 'Top each jar with berries and almond butter before refrigerating.'],
    storage: 'Fridge 4 days.',
  },
  b3: {
    servings: 4,
    prepTime: '10 min active',
    ingredients: ['1kg 0% Greek yogurt', '400g berries', '160g oats', '4 tsp honey'],
    steps: ['Add yogurt to 4 containers.', 'Layer berries and oats on top.', 'Add honey right before eating if you want the oats crisp.'],
    storage: 'Fridge 3 days with oats, 4 days if oats stay separate.',
  },
  b4: {
    servings: 3,
    prepTime: '20 min active',
    ingredients: ['18 egg whites', '3 whole eggs', '3 cups spinach', '90g feta', '6 slices whole grain toast', 'Salt, pepper, chili flakes'],
    steps: ['Saute spinach until wilted.', 'Add egg whites and whole eggs, then scramble gently.', 'Fold in feta and portion with toast on the side.'],
    storage: 'Fridge 3 days. Toast fresh.',
  },
  b5: {
    servings: 4,
    prepTime: '25 min active',
    ingredients: ['320g oats', '8 eggs', '4 scoops whey', '4 bananas', '400g blueberries', 'Baking powder', 'Cinnamon'],
    steps: ['Blend oats into flour, then blend with eggs, whey, bananas, baking powder, and cinnamon.', 'Fold in blueberries.', 'Cook pancakes and portion into 4 containers.'],
    storage: 'Fridge 4 days or freezer 1 month.',
  },
  b6: {
    servings: 1,
    prepTime: '5 min assembly',
    ingredients: ['2 egg white bite packs', '1 oatmeal cup', '25g whey', 'Water or coffee for whey'],
    steps: ['Heat egg white bites.', 'Prepare oatmeal.', 'Shake whey separately and pair with the meal.'],
    storage: 'Best same day. Use as a travel fallback.',
  },
  l1: {
    servings: 4,
    prepTime: '35 min active',
    ingredients: ['800g cooked chicken breast', '4 cups cooked basmati rice', '8 cups spinach', '4 tbsp salsa', '4 tsp EVOO', 'Lime, salt, pepper'],
    steps: ['Season and cook chicken, then slice.', 'Cook rice and portion 1 cup per container.', 'Add spinach, chicken, salsa, and EVOO.'],
    storage: 'Fridge 4 days. Add salsa after reheating.',
  },
  l2: {
    servings: 4,
    prepTime: '40 min active',
    ingredients: ['800g cooked chicken breast', '800g sweet potato', '8 cups spinach', '2 avocados', 'Garlic, paprika, salt'],
    steps: ['Roast cubed sweet potato at 425F until tender.', 'Cook chicken with garlic and paprika.', 'Portion chicken, sweet potato, spinach, and half avocado per serving.'],
    storage: 'Fridge 4 days. Cut avocado day-of.',
  },
  l3: {
    servings: 4,
    prepTime: '35 min active',
    ingredients: ['800g cooked chicken breast', '4 cups cooked quinoa', '4 cups broccoli', '2 tsp turmeric', '1 tsp cumin', 'Black pepper', 'Lemon'],
    steps: ['Cook quinoa with turmeric, cumin, and black pepper.', 'Steam broccoli until just tender.', 'Portion quinoa, broccoli, and chicken; finish with lemon.'],
    storage: 'Fridge 4 days.',
  },
  l4: {
    servings: 4,
    prepTime: '25 min active',
    ingredients: ['800g cooked chicken breast', '2 cans lentil soup', '4 cups cooked rice', '8 cups spinach', 'Chili flakes'],
    steps: ['Warm lentil soup and fold in spinach.', 'Portion rice and chicken into containers.', 'Add lentil-spinach mix over top.'],
    storage: 'Fridge 4 days. Keep soup separate if you prefer rice firmer.',
  },
  l5: {
    servings: 3,
    prepTime: '25 min active',
    ingredients: ['450g salmon', '3 cups cooked rice', '1.5 avocados', '6 cups greens', 'Lemon', 'Salt', 'Pepper'],
    steps: ['Bake salmon at 400F until just cooked.', 'Portion rice and greens.', 'Add flaked salmon and avocado day-of.'],
    storage: 'Fridge 3 days. Add avocado day-of.',
  },
  l6: {
    servings: 3,
    prepTime: '30 min active',
    ingredients: ['450g salmon', '3 cups cooked quinoa', '3 cups broccoli', '3 cups spinach', '3 tsp EVOO', 'Lemon herb seasoning'],
    steps: ['Bake salmon and flake into large pieces.', 'Steam broccoli and wilt spinach.', 'Portion quinoa, vegetables, salmon, and EVOO.'],
    storage: 'Fridge 3 days.',
  },
  d1: {
    servings: 3,
    prepTime: '35 min active',
    ingredients: ['510g salmon', '600g sweet potato', '6 cups spinach', '3 tsp EVOO', 'Lemon', 'Garlic', 'Parsley'],
    steps: ['Roast sweet potatoes until soft.', 'Bake salmon with lemon, garlic, and parsley.', 'Wilt spinach and portion with EVOO.'],
    storage: 'Fridge 3 days.',
  },
  d2: {
    servings: 3,
    prepTime: '30 min active',
    ingredients: ['510g salmon', '3 cups cooked rice', '3 cups broccoli', '1 tbsp grated ginger', '1 tsp turmeric', 'Soy or coconut aminos'],
    steps: ['Bake salmon with ginger, turmeric, and soy.', 'Steam broccoli.', 'Portion with rice and spoon pan juices over top.'],
    storage: 'Fridge 3 days.',
  },
  d3: {
    servings: 3,
    prepTime: '35 min active',
    ingredients: ['510g salmon', '600g sweet potato', '3 cups broccoli', '1.5 tbsp honey', '3 garlic cloves', 'Lemon'],
    steps: ['Roast sweet potato and broccoli.', 'Bake salmon with honey, garlic, and lemon.', 'Portion vegetables and salmon together.'],
    storage: 'Fridge 3 days.',
  },
  d4: {
    servings: 4,
    prepTime: '40 min active',
    ingredients: ['880g cooked chicken breast', '900g sweet potato', '8 cups spinach', 'Garlic', 'Rosemary', 'Parsley'],
    steps: ['Boil or roast sweet potatoes, then mash with garlic and herbs.', 'Cook chicken and slice.', 'Wilt spinach and portion all components.'],
    storage: 'Fridge 4 days.',
  },
  d5: {
    servings: 4,
    prepTime: '30 min active',
    ingredients: ['880g cooked chicken breast', '4 cups cooked rice', '2 cans lentil soup', '2 tsp turmeric', 'Black pepper', 'Spinach optional'],
    steps: ['Warm lentil soup with turmeric and black pepper.', 'Cook or reheat rice.', 'Portion chicken, rice, and lentils into containers.'],
    storage: 'Fridge 4 days.',
  },
  d6: {
    servings: 4,
    prepTime: '30 min active',
    ingredients: ['880g cooked chicken breast', '6 cups broccoli', '2 avocados', '4 tsp EVOO', 'Lemon pepper seasoning'],
    steps: ['Cook chicken with lemon pepper.', 'Steam broccoli until bright green.', 'Portion chicken and broccoli; add avocado and EVOO day-of.'],
    storage: 'Fridge 4 days. Add avocado day-of.',
  },
  s1: {
    servings: 4,
    prepTime: '8 min active',
    ingredients: ['800g Greek yogurt', '400g strawberries', '60g almonds', '8 rice cakes'],
    steps: ['Portion yogurt into 4 containers.', 'Top with strawberries and almonds.', 'Pack rice cakes separately.'],
    storage: 'Fridge 3 days.',
  },
  s2: {
    servings: 4,
    prepTime: '8 min active',
    ingredients: ['800g cottage cheese', '4 bananas', '60g walnuts', 'Cinnamon'],
    steps: ['Portion cottage cheese.', 'Top with cinnamon and walnuts.', 'Add banana day-of to avoid browning.'],
    storage: 'Fridge 4 days. Add banana day-of.',
  },
  s3: {
    servings: 1,
    prepTime: '3 min assembly',
    ingredients: ['1.5 scoops whey', '1 apple', '1 tbsp almond butter', 'Water'],
    steps: ['Shake whey with water.', 'Slice apple.', 'Use almond butter as dip.'],
    storage: 'Best same day.',
  },
  s4: {
    servings: 3,
    prepTime: '6 min active',
    ingredients: ['900ml Fairlife milk', '120g oats', '300g blueberries', 'Cinnamon'],
    steps: ['Portion oats and cinnamon into 3 jars.', 'Add Fairlife and blueberries.', 'Shake and refrigerate.'],
    storage: 'Fridge 3 days.',
  },
}

function measurementGuidanceFor(meal, recipe) {
  const text = `${meal.name} ${meal.desc} ${(recipe.ingredients ?? []).join(' ')}`.toLowerCase()
  const notes = []

  if (text.includes('chicken')) {
    notes.push('Chicken portions are cooked weights when listed as cooked chicken. As a rough conversion, 200g cooked chicken is about 255-270g raw; 220g cooked is about 280-300g raw.')
  }

  if (text.includes('salmon')) {
    notes.push('Salmon grams are raw fillet weight unless your food log explicitly says cooked. Cooked salmon is usually about 75-85% of raw weight after baking.')
  }

  if (text.includes('rice')) {
    notes.push('Rice amounts are cooked volume/weight. If logging dry rice, 1 cup cooked rice is roughly 60-70g dry depending on the rice.')
  }

  if (text.includes('quinoa')) {
    notes.push('Quinoa amounts are cooked volume/weight. If logging dry quinoa, 1 cup cooked quinoa is roughly 55-65g dry.')
  }

  if (text.includes('sweet potato')) {
    notes.push('Sweet potato grams can be weighed raw for prep or cooked for logging, but keep the food log entry matched to the same raw/cooked state.')
  }

  if (text.includes('oat') || text.includes('yogurt') || text.includes('cottage cheese') || text.includes('fairlife') || text.includes('whey')) {
    notes.push('Packaged and dry ingredients like oats, yogurt, cottage cheese, Fairlife, and whey should be measured as listed on the label or dry package weight.')
  }

  if (text.includes('avocado')) {
    notes.push('Avocado should be measured as edible portion only, without skin or pit.')
  }

  return notes.length > 0
    ? notes.join(' ')
    : 'Use the macro source consistently: raw weights with raw entries, cooked weights with cooked entries.'
}

export const MEALS = Object.fromEntries(
  Object.entries(BASE_MEALS).map(([group, meals]) => [
    group,
    meals.map((meal) => ({
      ...meal,
      recipe: {
        ...RECIPES[meal.id],
        measurement: measurementGuidanceFor(meal, RECIPES[meal.id]),
      },
    })),
  ])
)

export const MACRO_TARGETS = { kcal: 2100, protein: 185, carbs: 200, fat: 62 }
