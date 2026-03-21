module.exports = function (api) {
    api.cache(true);
    return {
        presets: ["babel-preset-expo", "@react-native/babel-preset"],
        plugins: ["nativewind/babel", "react-native-reanimated/plugin"],
    };
};
