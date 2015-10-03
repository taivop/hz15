

convert_temp = function(d) {
    return 2 * d / (9 * 4.095) - 61.1;
}

convert_light = function(d) {
    return 1.5094 * d / 4.095 + 37.515;
}

convert_humid = function(d) {
    return 0.1906 * d / 4.095 - 40.2;
}

convert_motion = function(d) {
    return d / (4.095 * 500) - 1;
}

convert_noise = function(d) {
    return 16.801 * Math.log(d) + 9.872;
}