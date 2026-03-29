<?php
/**
 * ProcessImageClasses.module
 * Adds a configurable CSS class selector for images in TinyMCE and CKEditor.
 *
 * Works in the ProcessWire admin and in the frontend editor.
 * Autoloaded — no need to assign to individual fields.
 */

class ProcessImageClasses extends WireData implements Module, ConfigurableModule
{
	public static function getModuleInfo()
	{
		return [
			'title'    => 'Image Classes',
			'version'  => 11,
			'summary'  => 'Adds a CSS class selector for images in TinyMCE and CKEditor (admin + frontend editor).',
			'author' => 'frameless Media',
			'singular' => true,
			'autoload' => true,
			'icon'     => 'picture-o',
			'requires' => ['ProcessWire>=3.0.0'],
		];
	}

	protected $defaultClasses = [
		['text' => 'None',                   'value' => ''],
		['text' => 'Responsive (img-fluid)', 'value' => 'img-fluid'],
	];

	public function ready()
	{
		if (!$this->wire('user')->isLoggedin()) return;

		$config = $this->wire('config');
		$page   = $this->wire('page');

		if ($page->template->name === 'admin') {
			// In the admin the AdminTheme outputs $config->scripts as
			// <script src=""> tags in the page — safe, never in AJAX fragments.
			$config->js('ImageClasses', ['classes' => $this->getImageClasses()]);
			$config->scripts->add($config->urls->ProcessImageClasses . 'ProcessImageClasses.js');
		} else {
			// On frontend pages $config->scripts is not rendered by the site
			// template.  Hook the complete page render instead and inject the
			// config + script tag before </body>.
			$this->addHookAfter('Page::render', $this, 'injectFrontendScript');
		}
	}

	public function injectFrontendScript(HookEvent $event)
	{
		$config  = $this->wire('config');
		$classes = json_encode(
			$this->getImageClasses(),
			JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
		);
		$src = htmlspecialchars(
			$config->urls->ProcessImageClasses . 'ProcessImageClasses.js',
			ENT_QUOTES
		);

		$inject = '<script>'
			. 'window.ProcessWire=window.ProcessWire||{};'
			. 'ProcessWire.config=ProcessWire.config||{};'
			. 'ProcessWire.config.ImageClasses={"classes":' . $classes . '};'
			. '</script>'
			. '<script src="' . $src . '"></script>';

		$event->return = str_replace('</body>', $inject . '</body>', $event->return);
	}

	// -------------------------------------------------------------------------
	// Admin configuration
	// -------------------------------------------------------------------------

	public function getModuleConfigInputfields(array $data)
	{
		$inputfields = new InputfieldWrapper();

		$f = $this->modules->get('InputfieldTextarea');
		$f->attr('name', 'imageClasses');
		$f->label       = 'CSS Classes for Images';
		$f->description = 'One entry per line in the format: Label=css-class  (e.g. Responsive=img-fluid). '
			. 'Leave the value empty to offer a "remove class" option.';
		$f->value = $this->classesToText($data['imageClasses'] ?? null);
		$f->rows  = 10;

		$inputfields->add($f);
		return $inputfields;
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	private function getImageClasses(): array
	{
		$stored = $this->get('imageClasses');
		return (is_string($stored) && trim($stored) !== '')
			? $this->textToClasses($stored)
			: $this->defaultClasses;
	}

	private function textToClasses(string $text): array
	{
		$classes = [];
		foreach (explode("\n", trim($text)) as $line) {
			$line = trim($line);
			if ($line !== '' && str_contains($line, '=')) {
				[$label, $value] = explode('=', $line, 2);
				$classes[] = ['text' => trim($label), 'value' => trim($value)];
			}
		}
		return $classes ?: $this->defaultClasses;
	}

	private function classesToText($classes): string
	{
		if (is_string($classes)) return $classes;
		return implode("\n", array_map(
			fn($c) => $c['text'] . '=' . $c['value'],
			is_array($classes) ? $classes : $this->defaultClasses
		));
	}
}
