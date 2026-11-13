export const defaultAppearance = { color: "periwinkle", accessory: "none" };
export const emptyProfile = {
  version: 1,
  introduction: "",
  aboutMe: "",
  lookingFor: "",
  visibility: "private",
  discoveryOptIn: false,
  appearance: defaultAppearance,
};
// Never infer personal habits from desired roommate traits.
export function profileFromGoal(profile, goal) {
  return {
    ...emptyProfile,
    ...profile,
    appearance: { ...defaultAppearance, ...profile?.appearance },
    originalText: goal.rawPrompt,
    housing: {
      city: goal.city,
      neighborhoods: [...goal.preferredNeighborhoods],
      startDate: goal.startDate,
      endDate: goal.endDate,
      budgetAmount: goal.budgetAmount,
      budgetBasis: goal.budgetBasis,
      roommateCount: goal.roommateCount,
      alreadyHasHome: goal.intent === "Both" ? false : goal.alreadyHasHome,
    },
    desiredPreferences: [...goal.preferences],
  };
}
export function prepareProfile(profile, userId) {
  if (!profile.introduction.trim())
    throw new Error("Add a short introduction before saving your profile.");
  return {
    ...profile,
    version: 1,
    userId,
    introduction: profile.introduction.trim(),
    aboutMe: profile.aboutMe.trim(),
    lookingFor: profile.lookingFor.trim(),
    discoveryOptIn:
      profile.visibility === "roommates" && !!profile.discoveryOptIn,
    updatedAt: new Date().toISOString(),
    persistence: "local",
  };
}
