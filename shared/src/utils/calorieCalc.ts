import type { CalorieGoals, CalorieLogEntry, MealType } from '../types/vision.js';

export interface CalorieSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  remainingCalories: number;
  isOverTarget: boolean;
  caloriePercent: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  byMeal: Record<MealType, CalorieLogEntry[]>;
}

export const summarizeCalorieLog = (
  entries: CalorieLogEntry[],
  goals: CalorieGoals
): CalorieSummary => {
  const byMeal: Record<MealType, CalorieLogEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const entry of entries) {
    totalCalories += entry.calories || 0;
    totalProtein += entry.protein || 0;
    totalCarbs += entry.carbs || 0;
    totalFat += entry.fat || 0;
    if (byMeal[entry.meal]) {
      byMeal[entry.meal].push(entry);
    } else {
      byMeal.snack.push(entry);
    }
  }

  const target = Math.max(1, goals.dailyCalories);
  const remainingCalories = goals.dailyCalories - totalCalories;

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
    remainingCalories: Math.round(remainingCalories),
    isOverTarget: remainingCalories < 0,
    caloriePercent: Math.min(100, Math.round((totalCalories / target) * 100)),
    proteinPercent:
      goals.proteinGrams > 0
        ? Math.min(100, Math.round((totalProtein / goals.proteinGrams) * 100))
        : 0,
    carbsPercent:
      goals.carbsGrams > 0
        ? Math.min(100, Math.round((totalCarbs / goals.carbsGrams) * 100))
        : 0,
    fatPercent:
      goals.fatGrams > 0
        ? Math.min(100, Math.round((totalFat / goals.fatGrams) * 100))
        : 0,
    byMeal,
  };
};
