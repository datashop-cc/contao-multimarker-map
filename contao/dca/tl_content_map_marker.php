<?php

declare(strict_types=1);

use Contao\DC_Table;

$GLOBALS['TL_DCA']['tl_content_map_marker'] = [
    'config' => [
        'dataContainer'    => DC_Table::class,
        'ptable'           => 'tl_content',
        'enableVersioning' => true,
        'sql' => [
            'keys' => [
                'id' => 'primary',
                'pid' => 'index',
            ],
        ],
    ],
    'list' => [
        'sorting' => [
            'mode'        => 4, // Manuelle Sortierung (Drag & Drop) innerhalb des Parents
            'fields'      => ['sorting'],
            'headerFields'=> ['headline'],
            'panelLayout' => 'filter;sort,search,limit',
            'child_record_callback' => static function (array $row): string {
                $tooltip = $row['tooltip'] ? ' – ' . strip_tags((string) $row['tooltip']) : '';

                return sprintf(
                    '<div class="tl_content_left">%s <span style="color:#999;padding-left:3px">[%s, %s]%s</span></div>',
                    $row['title'] ?: '(ohne Titel)',
                    $row['lat'],
                    $row['lng'],
                    $tooltip
                );
            },
        ],
        'label' => [
            'fields' => ['title'],
            'format' => '%s',
        ],
        'global_operations' => [
            'all' => [
                'href'       => 'act=select',
                'class'      => 'header_edit_all',
                'attributes' => 'onclick="Backend.getScrollOffset()" accesskey="e"',
            ],
        ],
        'operations' => [
            'edit'   => [
                'href' => 'act=edit',
                'icon' => 'edit.svg',
                'primary' => true,
            ],
            'copy'   => ['href' => 'act=copy', 'icon' => 'copy.svg'],
            'delete' => [
                'href'       => 'act=delete',
                'icon'       => 'delete.svg',
                'attributes' => 'onclick="if(!confirm(\'' . '\'))return false;Backend.getScrollOffset()"',
                'primary'    => true,
            ],
            'toggle' => [
                'href'    => 'act=toggle&field=published',
                'icon'    => 'visible.svg',
                'primary' => true,
            ],
            'show'   => ['href' => 'act=show', 'icon' => 'show.svg'],
        ],
    ],
    'palettes' => [
        'default' => '{title_legend},title,published;{position_legend},lat,lng;{tooltip_legend},tooltip',
    ],
    'fields' => [
        'id' => ['sql' => "int(10) unsigned NOT NULL auto_increment"],
        'pid' => [
            'foreignKey' => 'tl_content.id',
            'sql'        => "int(10) unsigned NOT NULL default 0",
            'relation'   => ['type' => 'belongsTo', 'load' => 'lazy'],
        ],
        'tstamp' => ['sql' => "int(10) unsigned NOT NULL default 0"],
        'sorting' => ['sql' => "int(10) unsigned NOT NULL default 0"],
        'title' => [
            'inputType' => 'text',
            'eval'      => ['mandatory' => true, 'maxlength' => 255, 'tl_class' => 'w50'],
            'sql'       => "varchar(255) NOT NULL default ''",
        ],
        'published' => [
            'inputType' => 'checkbox',
            'toggle'    => true,
            'default'   => true,
            'eval'      => ['tl_class' => 'w50 m12'],
            'sql'       => "char(1) NOT NULL default '1'",
        ],
        'lat' => [
            'inputType' => 'text',
            'eval'      => [
                'mandatory' => true,
                'tl_class'  => 'w50',
            ],
            'wizard' => [
                ['Datashop\MultiMarkerMap\Dca\ContentMarkerCallbacks', 'addressSearchWizard'],
            ],
            'save_callback' => [
                ['Datashop\MultiMarkerMap\Dca\ContentMarkerCallbacks', 'validateCoordinate'],
            ],
            'sql' => "varchar(20) NOT NULL default ''",
        ],
        'lng' => [
            'inputType' => 'text',
            'eval'      => ['mandatory' => true, 'tl_class' => 'w50'],
            'save_callback' => [
                ['Datashop\MultiMarkerMap\Dca\ContentMarkerCallbacks', 'validateCoordinate'],
            ],
            'sql' => "varchar(20) NOT NULL default ''",
        ],
        'tooltip' => [
            'inputType' => 'textarea',
            'eval'      => ['rte' => 'tinyMCE', 'tl_class' => 'clr'],
            'sql'       => "text NULL",
        ],
    ],
];
