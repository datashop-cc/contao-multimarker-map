<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap\Model;

use Contao\Model;
use Contao\Model\Collection;

/**
 * @property int    $id
 * @property int    $pid
 * @property int    $tstamp
 * @property string $title
 * @property string $lat
 * @property string $lng
 * @property string $tooltip
 * @property int    $sorting
 * @property bool   $published
 */
class MapMarkerModel extends Model
{
    protected static $strTable = 'tl_content_map_marker';

    public static function findPublishedByPid(int $pid): ?Collection
    {
        return static::findBy(
            ['pid=?', 'published=?'],
            [$pid, 1],
            ['order' => 'sorting ASC']
        );
    }
}
