import { useTheme } from "../../theme/ThemeContext";
import { Icon } from "../icons/Icon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Koyu temaya geç" : "Açık temaya geç"}
    >
      <span
        className={`theme-toggle__track theme-toggle__track--${theme}`}
      >
        <span className="theme-toggle__thumb">
          <Icon name={theme === "light" ? "sun" : "moon"} size={13} />
        </span>
      </span>
    </button>
  );
}
