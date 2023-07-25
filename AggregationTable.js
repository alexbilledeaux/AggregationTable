import * as React from 'react';
import { useEffect } from 'react';
import { Stack } from '@mui/system';
import { Button, TextField } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

// Table
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function AggregatedRow(props) {
    const {dataStructure, row } = props;
    const [open, setOpen] = React.useState(false);
    useEffect(() => {
        if (props.expandTrigger) {
            setOpen(true);
        } else if (props.condenseTrigger) {
            setOpen(false);
        }
    }, [props.expandTrigger, props.condenseTrigger]);
  
    return (
      <React.Fragment>
        <Row row={row} setOpen={() => setOpen(!open)} isOpen={open} dataStructure={dataStructure} />
        {row.data && open && row.data.map((job, index) => (
            <Row row={job} key={index} dataStructure={dataStructure} style={{backgroundColor: "#F8F8FF"}} />
        ))}
      </React.Fragment>
    );
  }

function Row(props) {
  const { row, setOpen, isOpen, dataStructure, style } = props;
  const formatOutput = (attribute) => {
    return attribute.format == "currency" ? row[attribute.attr].toFixed(2) : row[attribute.attr];
  }
  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }} style={style}>
        {setOpen ? <TableCell align="center">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={setOpen}
          >
            {isOpen ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}
          </IconButton>
        </TableCell> : <TableCell />}
        {dataStructure.map((attribute, index) => (
            <TableCell key={"headerCell" + index} align="center">
                {formatOutput(attribute)}
            </TableCell>
        ))}
      </TableRow>
    </React.Fragment>
  );
}

function AggregationTable(props) {

    const [aggregated, setAggregated] = React.useState(true);
    const [expandTrigger, setExpandTrigger] = React.useState(0);
    const [condenseTrigger, setCondenseTrigger] = React.useState(0);
    const [currentPage, setCurrentPage] = React.useState(0);
    const [order, setOrder] = React.useState('desc');
    const [orderBy, setOrderBy] = React.useState(props.initialSort);
    const [search, setSearch] = React.useState("");
    const [rows, setRows] = React.useState([]);
    const [filteredRows, setFilteredRows] = React.useState([]);

    const [searchColumn, setSearchColumn] = React.useState('');
    const handleSearchColumnChange = (event) => {
        setSearchColumn(event.target.value);
    };

    useEffect(() => {
        setRows(preProcessTableData(props.rows));
      }, [props.rows, order, orderBy, aggregated]);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
      };

    const handleExpandTrigger = () => {
        setCondenseTrigger(0);
        setExpandTrigger(expandTrigger + 1);
    }

    const handleCondenseTrigger = () => {
        setExpandTrigger(0);
        setCondenseTrigger(condenseTrigger + 1);
    }

    const handleAggregatedSwitch = (event) => {
        setAggregated(event.target.checked);
    };

    const stableSort = (array, comparator) => {
        const stabilizedThis = array.map((el, index) => [el, index]);
        stabilizedThis.sort((a, b) => {
            const order = comparator(a[0], b[0]);
            if (order !== 0) {
                return order;
            }
            return a[1] - b[1];
        });
        return stabilizedThis.map((el) => el[0]);
    }
    
    const descendingComparator = (a, b, orderBy) => {
        if (b[orderBy] < a[orderBy]) {
          return -1;
        }
        if (b[orderBy] > a[orderBy]) {
          return 1;
        }
        return 0;
      }
      
    const getComparator = (order, orderBy) => {
        return order === 'desc'
          ? (a, b) => descendingComparator(a, b, orderBy)
          : (a, b) => -descendingComparator(a, b, orderBy);
    }

    const calculateDerivedAttributes = (data) => {
        for (const row in data) {
            for (const attribute in props.dataStructure) {
                if (props.dataStructure[attribute].deriveValue != null) {
                    let key = props.dataStructure[attribute].attr;
                    data[row][key] = props.dataStructure[attribute].deriveValue(data[row]);
                    if (aggregated) {
                        for (const job in data[row].jobs) {
                            data[row].jobs[job][key] = props.dataStructure[attribute].deriveValue(data[row].jobs[job]);
                        }
                    }
                }
            }
        }
        return data;
    }

    const preProcessTableData = (data) => {
        data = calculateDerivedAttributes(data);
        if (aggregated && data.length > 0) {
            data = aggregateData(data, props.aggregationProperties);
            data = calculateDerivedAttributes(data);
            // Sort the jobs under each campaign
            for (const datum in data) {
                data[datum].data = stableSort(data[datum].data, getComparator(order, orderBy));
            }
        }
        data = stableSort(data, getComparator(order, orderBy));
        setFilteredRows(data);
        return data;
    }


    const getPropertyValueCombinations = (data, properties) => {
        // Create an object with an empty array to contain potential values for each property
        let propertyValues = {};
        for (const property in properties) {
            propertyValues[properties[property]] = [];
        }
        // Loop through the data and add the potential values to the arrays
        for (const datum in data) {
            for (const property in properties) {
                if (!propertyValues[properties[property]].includes(data[datum][properties[property]])) {
                    propertyValues[properties[property]].push(data[datum][properties[property]]);
                }
            }
        }
        // For each possible combination of property values, create an object to represent it
        // To Do: Add support for more or less than 2 aggregation properties
        let propertyValueCombinations = [];
        for (const val in propertyValues[properties[0]]) {
            for (const val2 in propertyValues[properties[1]]) {
                let propertyValueCombination = {};
                propertyValueCombination[properties[0]] = propertyValues[properties[0]][val];
                propertyValueCombination[properties[1]] = propertyValues[properties[1]][val2];
                propertyValueCombination.data = [];
                propertyValueCombinations.push(propertyValueCombination);
            }
        }
        return propertyValueCombinations;
    }

    const getAggregateValue = (data, property) => {
        let aggregateValue = 0;
        for (const datum in data) {
            aggregateValue += parseFloat(data[datum][property]);
        }
        return aggregateValue;
    }

    const getAggregateMinimum = (data, property) => {
        let aggregateMinimum = data[0][property];
        for (const datum in data) {
            if (aggregateMinimum > data[datum][property]) {
                aggregateMinimum = data[datum][property];
            }
        }
        return aggregateMinimum;
    }

    const getAggregateMode = (data, property) => {
        let allValues = [];
        for (const datum in data) {
            allValues.push(data[datum][property]);
        }
        return mode(allValues);
    }

    const mode = (array) => {
        if(array.length == 0)
            return null;
        var modeMap = {};
        var maxEl = array[0], maxCount = 1;
        for(var i = 0; i < array.length; i++)
        {
            var el = array[i];
            if(modeMap[el] == null)
                modeMap[el] = 1;
            else
                modeMap[el]++;  
            if(modeMap[el] > maxCount)
            {
                maxEl = el;
                maxCount = modeMap[el];
            }
        }
        return maxEl;
    }

    const paginationRender = () => {
        // No pagination needed
        if (filteredRows.length < 51) {
            return filteredRows;
        }
        let paginated = filteredRows.slice((currentPage * 50), (currentPage * 50 + 51));
        return paginated;
    }

    const paginationButtons = () => {
        let pages = Math.ceil(filteredRows.length / 50);
        let buttons = [];
        for (let i = 0; i < pages; i++) {
            buttons.push(i + 1);
        }
        return buttons;
    }

    const aggregateData = (data, properties) => {
        // Get all possible combinations of the aggregation properties
        let aggregationCombinations = getPropertyValueCombinations(data, properties);
        // Loop through the data and add them to the object where they match
        for (const aggregationCombination in aggregationCombinations) {
            for (const datum in data) {
                let matches = true;
                for (const property in properties) {
                    if (data[datum][properties[property]] != aggregationCombinations[aggregationCombination][properties[property]]) {
                        matches = false;
                    }
                }
                if (matches) {
                    aggregationCombinations[aggregationCombination].data.push(data[datum]);
                }
            }
        }
        // Remove combinations with no associated data.
        let aggregatedData = [];
        for (const aggregationCombination in aggregationCombinations) {
            if (aggregationCombinations[aggregationCombination].data.length > 0) {
                aggregatedData.push(aggregationCombinations[aggregationCombination]);
            }
        }

        // Calculate aggregate values
        for (const aggregatedDatum in aggregatedData) {
            for (const aggregateValue in props.aggregateValues) {
                aggregatedData[aggregatedDatum][props.aggregateValues[aggregateValue]] = getAggregateValue(aggregatedData[aggregatedDatum].data, props.aggregateValues[aggregateValue]);
            }
            for (const aggregateMinimum in props.aggregateMinimum) {
                aggregatedData[aggregatedDatum][props.aggregateMinimum[aggregateMinimum]] = getAggregateMinimum(aggregatedData[aggregatedDatum].data, props.aggregateMinimum[aggregateMinimum]);
            }
            for (const aggregateMode in props.aggregateMode) {
                aggregatedData[aggregatedDatum][props.aggregateMode[aggregateMode]] = getAggregateMode(aggregatedData[aggregatedDatum].data, props.aggregateMode[aggregateMode]);
            }
            for (const aggregateNone in props.aggregateNone) {
                aggregatedData[aggregatedDatum][props.aggregateNone[aggregateNone]] = "";
            }
        }
        
        return aggregatedData;

    }

    const handleSearch = () => {
        // Don't search if no column is selected
        if (searchColumn == "") {
            return rows;
        }
        let filtered = [];
        for (const row in rows) {
            let add = false;
            console.log(rows[row]);
            if (rows[row][searchColumn].includes(search)) {
                add = true;
            }
            for (const datum in rows[row].data) {
                if (rows[row].data[datum][searchColumn].includes(search)) {
                    add = true;
                }
            }
            if (add) {
                filtered.push(rows[row]);
            }
        }
        setFilteredRows(filtered);
    }

    return (
        <div className="AggregationTable">
            <Stack direction="row" sx={{marginBottom:3}} spacing={2}>
                <Button onClick={handleExpandTrigger} variant="outlined" disabled={!aggregated}>Expand All</Button>
                <Button onClick={handleCondenseTrigger} variant="outlined" disabled={!aggregated}>Condense All</Button>
                <FormControlLabel control={<Switch checked={aggregated} onChange={handleAggregatedSwitch} />} label="Group By Campaign?" />
            </Stack>
            <Stack direction="row" sx={{marginBottom:3}} spacing={2}>
                <TextField
                    variant="outlined"
                    placeholder="Search..."
                    size="small"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                    }}
                    style={{width: "35%"}}
                />
                {/* TODO: Make this dynamiclly display all columns */}
                <FormControl style={{minWidth: "160px"}}>
                    <InputLabel id="search-label" size="small">Search Column</InputLabel>
                    <Select
                        labelId="search-label"
                        id="search-select"
                        value={searchColumn}
                        label="Search Column"
                        size="small"
                        onChange={handleSearchColumnChange}
                    >
                        {props.dataStructure.map((attribute, index) => (
                            <MenuItem key={index} value={attribute.attr}>{attribute.displayName}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <IconButton type="submit" aria-label="search" onClick={handleSearch}>
                    <SearchIcon style={{ fill: "#1976d2" }} />
                </IconButton>
            </Stack>
            <TableContainer component={Paper}>
            <Table aria-label="collapsible table">
                <TableHead>
                <TableRow>
                    {/* Empty cell to provide space for the dropdown arrow on the rows */}
                    <TableCell />
                    {props.dataStructure.map((attr, index) => (
                        <TableCell key={"headerCell" + index} align="center">
                            <TableSortLabel
                                active={orderBy === attr.attr}
                                direction={orderBy === attr.attr ? order : 'asc'}
                                onClick={() => handleRequestSort(attr.attr)}
                            >
                                {attr.displayName}
                            </TableSortLabel>
                        </TableCell>
                    ))}
                </TableRow>
                </TableHead>
                <TableBody>
                    {paginationRender().map((data, index) => (
                        aggregated ? <AggregatedRow row={data} key={index} dataStructure={props.dataStructure} expandTrigger={expandTrigger} condenseTrigger={condenseTrigger} /> :  <Row key={index} row={data} dataStructure={props.dataStructure} />
                    ))}
                </TableBody>
            </Table>
            </TableContainer>
            <Stack direction="row" justifyContent="center" sx={{margin:3}} spacing={1}>
                {paginationButtons().map((data, index) => (
                    <Button key={index} style={ currentPage == data - 1 ? { borderWidth: 2, fontWeight: "bold", borderColor: "rgb(25, 118, 210)"} : {}} onClick={() => setCurrentPage(data - 1)} variant="outlined">{data}</Button>
                ))}
            </Stack>
        </div>
  );
}

export default AggregationTable;
