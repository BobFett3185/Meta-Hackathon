const assets = {
  "nest:bedroom": require("./assets/bedroom.png"),
  "nest:market": require("./assets/market.png"),
  "nest:alex": require("./assets/alex.png"),
  "nest:jordan": require("./assets/jordan.png"),
  "nest:maya": require("./assets/maya.png"),
  "nest:leo": require("./assets/leo.png"),
};
export const imageSource = (uri) => assets[uri] || { uri };
